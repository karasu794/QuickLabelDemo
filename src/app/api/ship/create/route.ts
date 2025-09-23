import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceRoleClient, createRouteHandlerClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/org'
import { withOrderAdvisoryLock } from '@/lib/db/locks'
import { log, maskPII } from '@/lib/logging'
import { assertRateConsistency } from '@/lib/ship/rateGuard'
import { FedExError, fedexRequest, selectFedExCredentials } from '@/lib/fedex/client'
import { put } from '@vercel/blob'
import { createHash } from 'crypto'

function envBool(name: string, def = false): boolean {
  const v = process.env[name]
  if (v == null) return def
  return ['1','true','yes','on'].includes(String(v).toLowerCase())
}

function ensurePostAndOrigin(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, { status: 405 })
  }
  const origin = headers().get('origin')
  const referer = headers().get('referer')
  const allowed = req.nextUrl.origin
  if (origin && origin !== allowed) {
    return NextResponse.json({ code: 'CSRF', message: 'Origin mismatch' }, { status: 403 })
  }
  if (referer && !referer.startsWith(allowed)) {
    return NextResponse.json({ code: 'CSRF', message: 'Referer mismatch' }, { status: 403 })
  }
  return null
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function computeIdemKey(input: { orderId: string; postalCode: string; serviceType: string; weightKg: number; l: number; w: number; h: number }): string {
  const raw = `${input.orderId}|${input.postalCode}|${input.serviceType}|${input.weightKg}|${input.l}x${input.w}x${input.h}`
  return sha256Hex(raw)
}

type Party = { name: string; phone: string; address1: string; address2?: string|null; city: string; state?: string|null; postalCode: string; country: string }

type CreateShipRequest = {
  orderId: string
  reference?: string
  serviceType: string
  bill: { payer: 'SENDER'|'RECIPIENT'|'THIRD_PARTY' }
  shipper: Party
  recipient: Party
  package: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number }
}

type CreateShipResponse = {
  trackingNumber: string
  labelUrl: string
  serviceType: string
  rate: number
  currency: string
  needsPersistRetry?: boolean
}

async function ensurePaymentSettled(orderId: string): Promise<{ amount: number; currency: string; paymentId: string } | null> {
  try {
    const { SquareClient, SquareEnvironment } = await import('square') as any
    const client = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN!, environment: process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox })
    // orderId を Square Payment ID として扱う（突合仕様）。存在しない場合は null
    const resp = await client.paymentsApi.getPayment(orderId)
    const p = resp?.result?.payment
    if (!p) return null
    const status = String(p.status || '')
    const ok = ['COMPLETED', 'APPROVED', 'CAPTURED'].some(s => status.toUpperCase().includes(s))
    if (!ok) return null
    const amt = Number(p.amountMoney?.amount ?? 0)
    const currency = String(p.amountMoney?.currency || 'JPY')
    return { amount: amt, currency, paymentId: String(p.id) }
  } catch (e) {
    return null
  }
}

export async function POST(req: NextRequest) {
  const early = ensurePostAndOrigin(req)
  if (early) return early

  if (!envBool('SHIP_API_WRITE_ENABLED', false)) {
    const body = await req.json().catch(() => ({}))
    const orderId = String((body?.orderId ?? ''))
    log({ correlationId: orderId || 'n/a', event: 'ship_create_blocked', level: 'info' }, { reason: 'WRITE_DISABLED' })
    return NextResponse.json({ code: 'WRITE_DISABLED', message: 'Shipping write disabled' }, { status: 503 })
  }

  let input: CreateShipRequest
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid JSON' }, { status: 400 })
  }

  // 軽いバリデーション
  if (!input?.orderId || !input?.serviceType || !input?.shipper || !input?.recipient || !input?.package) {
    return NextResponse.json({ code: 'BAD_REQUEST', message: 'Missing required fields' }, { status: 400 })
  }
  const { weightKg, lengthCm, widthCm, heightCm } = input.package
  if ([weightKg, lengthCm, widthCm, heightCm].some(v => typeof v !== 'number' || v <= 0)) {
    return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid package dimensions/weight' }, { status: 400 })
  }

  // 認証/テナント
  let userId: string, orgId: string
  try {
    const { userId: uid, orgId: oid } = await requireOrg()
    userId = uid; orgId = oid
  } catch {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // 冪等性：既存返却
  {
    const { data: existing } = await supabase
      .from('shipments')
      .select('*')
      .filter('order_id', 'eq', input.orderId as any)
      .maybeSingle()
    if (existing && existing.tracking_number && (existing as any).label_blob_url) {
      log({ correlationId: input.orderId, event: 'ship_create_idempotent', level: 'info' }, { tracking: existing.tracking_number })
      return NextResponse.json({
        trackingNumber: existing.tracking_number as string,
        labelUrl: (existing as any).label_blob_url as string,
        serviceType: (existing as any).service_type || input.serviceType,
        rate: Number((existing as any).rate_total ?? 0),
        currency: (existing as any).currency || 'JPY',
      } satisfies CreateShipResponse)
    }
  }

  // 決済確認（orderId は Square Payment ID として扱う）
  const pay = await ensurePaymentSettled(input.orderId)
  if (!pay) {
    return NextResponse.json({ code: 'PAYMENT_REQUIRED', message: 'Payment is not settled' }, { status: 402 })
  }

  // 乖離チェック（参照=決済金額）
  await assertRateConsistency({ orderId: input.orderId, shipTotal: pay.amount, currency: pay.currency })

  // FedEx 資格情報選択
  const creds = selectFedExCredentials({ originCountry: input.shipper.country, destinationCountry: input.recipient.country })

  const idemKey = computeIdemKey({ orderId: input.orderId, postalCode: input.recipient.postalCode, serviceType: input.serviceType, weightKg, l: lengthCm, w: widthCm, h: heightCm })

  async function doShip(): Promise<NextResponse> {
    // 冪等作成（UNIQUE競合時は既存返却）
    // 先にもう一度存在確認（ロックによる並列の窓を縮める）
    {
      const { data: existing } = await supabase
        .from('shipments')
        .select('*')
        .filter('order_id', 'eq', input.orderId as any)
        .maybeSingle()
      if (existing && existing.tracking_number && (existing as any).label_blob_url) {
        return NextResponse.json({
          trackingNumber: existing.tracking_number as string,
          labelUrl: (existing as any).label_blob_url as string,
          serviceType: (existing as any).service_type || input.serviceType,
          rate: Number((existing as any).rate_total ?? 0),
          currency: (existing as any).currency || 'JPY',
        } satisfies CreateShipResponse)
      }
    }

    // FedEx Ship 本発行（URL_ONLY で取得→PDFを取りに行く）
    const body = {
      accountNumber: { value: creds.accountNumber },
      labelResponseOptions: 'URL_ONLY',
      requestedShipment: {
        shipper: {
          contact: { personName: input.shipper.name, phoneNumber: input.shipper.phone },
          address: {
            streetLines: [input.shipper.address1, input.shipper.address2 || ''].filter(Boolean),
            city: input.shipper.city,
            stateOrProvinceCode: input.shipper.state || undefined,
            postalCode: input.shipper.postalCode,
            countryCode: input.shipper.country,
          },
        },
        recipients: [
          {
            contact: { personName: input.recipient.name, phoneNumber: input.recipient.phone },
            address: {
              streetLines: [input.recipient.address1, input.recipient.address2 || ''].filter(Boolean),
              city: input.recipient.city,
              stateOrProvinceCode: input.recipient.state || undefined,
              postalCode: input.recipient.postalCode,
              countryCode: input.recipient.country,
              residential: false,
            },
          },
        ],
        serviceType: input.serviceType,
        packagingType: 'YOUR_PACKAGING',
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        shippingChargesPayment: { paymentType: input.bill.payer },
        requestedPackageLineItems: [
          {
            sequenceNumber: 1,
            groupPackageCount: 1,
            weight: { units: 'KG', value: weightKg },
            dimensions: { length: lengthCm, width: widthCm, height: heightCm, units: 'CM' },
          },
        ],
      },
    }

    let tracking = ''
    let rateAmount = 0
    let currency = 'JPY'
    let labelUrl = ''

    try {
      const { data } = await fedexRequest<any>({ endpoint: '/ship/v1/shipments', method: 'POST', body, kind: creds.kind, locale: 'ja_JP' })
      const ts = data?.output?.transactionShipments?.[0]
      tracking = ts?.masterTrackingNumber || ts?.pieceResponses?.[0]?.trackingNumber || ''
      const doc = ts?.pieceResponses?.[0]?.packageDocuments?.[0]
      // 料金が取れれば使用（無い場合は決済額を保存）
      const charge = data?.output?.transactionShipments?.[0]?.shipmentDocuments?.[0]?.totalNetCharge
      rateAmount = Number(charge?.amount ?? pay.amount)
      currency = String(charge?.currency ?? pay.currency ?? 'JPY')

      // ラベルURL（FedExの署名URL）
      const fedexLabelUrl: string | undefined = doc?.url
      if (!fedexLabelUrl) throw new Error('Label URL missing')

      // ラベルPDFを取得して Blob へ保存
      const accessToken = undefined // fedexRequest 内で取得済みのため、URL からのダウンロードには token が必要 → download-label 経由でもOK
      const pdfResp = await fetch(fedexLabelUrl, { headers: { 'Accept': 'application/pdf' } })
      if (!pdfResp.ok) throw new Error(`Label fetch failed: ${pdfResp.status}`)
      const buf = Buffer.from(await pdfResp.arrayBuffer())
      const yyyy = new Date().toISOString().slice(0,4)
      const mm = new Date().toISOString().slice(5,7)
      const key = `labels/${yyyy}/${mm}/${input.orderId}-${tracking}.pdf`
      const blob = await put(key, buf, { access: 'public', contentType: 'application/pdf', token: process.env.BLOB_READ_WRITE_TOKEN! })
      labelUrl = blob.url
    } catch (e) {
      if (e instanceof FedExError) {
        log({ correlationId: input.orderId, event: 'ship_create_failed', level: 'error' }, { code: e.code, status: e.status })
        return NextResponse.json({ code: e.code, message: e.message }, { status: e.status || 502 })
      }
      log({ correlationId: input.orderId, event: 'ship_create_failed', level: 'error' }, { err: String((e as Error)?.message || e) })
      return NextResponse.json({ code: 'SHIP_FAILED', message: 'Failed to create shipment' }, { status: 502 })
    }

    // DB 保存（UNIQUE競合時は既存再読込）
    try {
      const row: any = {
        order_id: input.orderId,
        org_id: orgId,
        user_id: userId,
        tracking_number: tracking,
        service_type: input.serviceType,
        fedex_account_kind: creds.kind,
        rate_total: rateAmount,
        currency,
        label_blob_url: labelUrl,
        square_payment_id: pay.paymentId,
        payment_status: 'completed',
      }
      const ins = await supabase.from('shipments').insert([row] as any).select('*').maybeSingle()
      if (ins.error && String(ins.error?.message || '').includes('duplicate')) {
        const { data: existing } = await supabase
          .from('shipments')
          .select('*')
          .filter('order_id', 'eq', input.orderId as any)
          .maybeSingle()
        if (existing) {
          return NextResponse.json({
            trackingNumber: existing.tracking_number as string,
            labelUrl: (existing as any).label_blob_url as string,
            serviceType: (existing as any).service_type || input.serviceType,
            rate: Number((existing as any).rate_total ?? rateAmount),
            currency: (existing as any).currency || currency,
          } satisfies CreateShipResponse)
        }
      }
    } catch (e) {
      // FedEx成功→DB/Blob失敗時でもラベルは返す
      log({ correlationId: input.orderId, event: 'ship_create_persist_failed', level: 'error' }, maskPII({ tracking, labelUrl }))
      return NextResponse.json({ trackingNumber: tracking, labelUrl, serviceType: input.serviceType, rate: rateAmount, currency, needsPersistRetry: true } satisfies CreateShipResponse)
    }

    return NextResponse.json({ trackingNumber: tracking, labelUrl, serviceType: input.serviceType, rate: rateAmount, currency } satisfies CreateShipResponse)
  }

  // 最終ロック（ベストエフォート）
  try {
    return await withOrderAdvisoryLock(input.orderId, doShip)
  } catch {
    // ロック不可でも続行（UNIQUE + 事前チェックで二重発行抑止）
    return await doShip()
  }
}
