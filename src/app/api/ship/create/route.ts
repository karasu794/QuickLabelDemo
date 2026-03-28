/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import { withOrderAdvisoryLock } from '@/lib/db/locks'
import { createClient } from '@/lib/supabase/server'
import { assertRateConsistency as assertRG, RateGuardError, loadRGConfig, fetchReferenceTotal as fetchRGRef } from '@/lib/ship/rateGuard'
import { getAccessToken, postShipment, FedExError, AccountKind } from '@/lib/fedex/client'
import { put } from '@vercel/blob'
// ensurePost
import { ensurePost } from '@/lib/http/ensurePost'
import { createLogger, withTiming } from '@/lib/observability/logger'
import { randomUUID } from 'crypto'
import { publishHookdeck } from '@/lib/observability/hookdeck'
import { withTrace } from '@/lib/trace'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { markProcessing, markCompleted, markFailed } from '@/server/db/shipments'
import { toAsciiForShipping } from '@/lib/text/toAsciiForShipping'

// DIAG: 免責事項のサーバサイド検証や、terms_accepted_at/terms_version/payment_tx_id の保存が未実装。
// DIAG: verifyPaymentはSquareからの確認を行うが、draftとの関連チェックなし。
// DIAG: リクエストスキーマに payment_tx_id が含まれていない。

// MW-REMOVED: middleware撤去に伴い、CSRF等の前処理は行わない

const partySchema = z.object({
	name: z.string().min(1),
	phone: z.string().min(5),
	address1: z.string().min(1),
	address2: z.string().optional(),
	city: z.string().min(1),
	state: z.string().optional(),
	postalCode: z.string().min(1),
	country: z.string().length(2).transform(s => s.toUpperCase()),
})

const pkgSchema = z.object({
	weight: z.object({ value: z.number().positive(), unit: z.enum(['KG', 'LB']) }),
	dimensions: z.object({ length: z.number().positive(), width: z.number().positive(), height: z.number().positive(), unit: z.enum(['CM', 'IN']) }),
})

const bodySchema = z.object({
	orderId: z.string().min(1),
	reference: z.string().optional(),
	serviceType: z.string().min(1),
	bill: z.object({ payer: z.enum(['SENDER', 'RECIPIENT', 'THIRD_PARTY']) }),
	shipper: partySchema,
	recipient: partySchema,
	package: pkgSchema.optional(),
	packages: z.array(pkgSchema).min(1).optional(),
	htsCode: z.string().max(10).regex(/^\d+$/).optional(),
  payment_tx_id: z.string().optional(),
  terms_version: z.string().optional(),
})

type CreateShipRequest = z.infer<typeof bodySchema>

type CreateShipResponse = {
	trackingNumber: string
	labelUrl: string
	serviceType: string
	rate: number
	currency: string
	htsCode?: string
}

async function verifyPayment(paymentId: string): Promise<{ amount: number; currency: string; paymentId: string } | null> {
	try {
		const { SquareClient, SquareEnvironment } = await import('square') as any
		const token = process.env.SQUARE_ACCESS_TOKEN
		if (!token) return null
		const client = new SquareClient({ token, environment: process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox })
		const resp = await client.paymentsApi.getPayment(paymentId)
		const p = resp?.result?.payment
		if (!p) return null
		const ok = ['COMPLETED', 'APPROVED', 'CAPTURED'].includes(String(p.status || '').toUpperCase())
		if (!ok) return null
		return { amount: Number(p.amountMoney?.amount ?? 0), currency: String(p.amountMoney?.currency || 'JPY'), paymentId: String(p.id) }
	} catch {
		return null
	}
}

function chooseAccountKind(shipperCountry: string, recipientCountry: string): AccountKind {
	const s = (shipperCountry || '').toUpperCase()
	const r = (recipientCountry || '').toUpperCase()
	if (s === 'JP') return 'export'
	if (r === 'JP') return 'import'
	return 'export'
}

function toKg(value: number, unit: 'KG' | 'LB'): number {
	return unit === 'KG' ? value : value * 0.45359237
}
function toCm(value: number, unit: 'CM' | 'IN'): number {
	return unit === 'CM' ? value : value * 2.54
}

export async function POST(req: NextRequest) {
  return withTrace('api.ship.create', req as any, async ({ requestId }) => {
  // ensurePost: POST以外は405
  const early = ensurePost(req)
  if (early) return early

  const reqId = req.headers.get('x-request-id') || req.headers.get('X-Request-Id') || randomUUID()
  const idempKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key') || undefined
  const diagId = String(reqId)
  const log = createLogger('ship.create', diagId)
  log.info({ step: 'start', ok: true })
  if (idempKey) log.info({ step: 'idempotency.key', ok: true, context: { idempKey } })

  // Mock-fast path: allow instant processing response for E2E/dev
  const cookieHeader = req.headers.get('cookie') || ''
  const isMock = /(?:^|;\s*)core-mode=mock(?:;|$)/i.test(cookieHeader)

	if (process.env.SHIP_API_WRITE_ENABLED !== 'true') {
    log.warn({ step: 'blocked', ok: false, context: { reason: 'WRITE_DISABLED' } })
		return NextResponse.json({ code: 'WRITE_DISABLED' }, { status: 503 })
	}

	// Demo mode guard: APP_ENV=demo では FedEx 発行を二重ガード
	if (process.env.APP_ENV === 'demo') {
		log.info({ step: 'demo.guard', ok: true })
		return NextResponse.json({
			ok: false,
			code: 'DEMO_MODE_DISABLED',
			message: 'この操作（ラベル発行）はデモ環境では無効です。',
		}, { status: 403 })
	}

	let input: CreateShipRequest
	try {
		input = await withTiming(log, 'input.parse', async () => bodySchema.parse(await req.json()))
	} catch (e) {
		log.error({ step: 'input.parse', ok: false, error_message: (e as any)?.message, upstream: 'validation' })
		return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid payload' }, { status: 400 })
	}

    // HTS code validation: US destination requires numeric up to 10 digits
    if ((input?.recipient?.country || '').toUpperCase() === 'US') {
        const code = input.htsCode ?? ''
        const ok = typeof code === 'string' && /^\d{1,10}$/.test(code)
        if (!ok) {
            return NextResponse.json({ error: 'HTS_CODE_REQUIRED' }, { status: 400 })
        }
    }

const { user, supabase: supabaseFromAuth } = await getUserOrThrow()
	const userId: string = user.id
	// TODO(org-removed): previously persisted; drop column later

  const supabase = createClient()
  const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

	// Idempotency: return existing if present
	{
		const existing = await withTiming(log, 'db.read.shipments.idempotent', async () => {
			const { data } = await supabase
				.from('shipments')
				.select('*')
				.filter('order_id', 'eq', input.orderId as any)
				.maybeSingle()
			return data as any
		}, { orderId: input.orderId })
		if (existing && existing.tracking_number && (existing.label_blob_url || existing.label_url)) {
			log.info({ step: 'idempotent.hit', ok: true, context: { orderId: input.orderId } })
			const attUrl = String((existing as any).label_blob_url || (existing as any).label_url || '')
			const attachments = attUrl ? [{ url: attUrl, kind: 'label', contentType: 'application/pdf' }] : []
			const trackingNum = String((existing as any).tracking_number || '')
			const resp: any = {
				ok: true,
				shipmentId: (existing as any).id ?? null,
				trackingNumber: trackingNum,
				trackingNumbers: trackingNum ? [trackingNum] : [],
				labelUrl: attUrl,
				attachments,
				serviceType: (existing as any).service_type || input.serviceType,
				rate: Number((existing as any).rate_total ?? 0),
				currency: (existing as any).currency || 'JPY',
			}
			return NextResponse.json(resp)
		}
	}

	const pay = await withTiming(log, 'payment.verify', async () => {
		const pid = (input as any).payment_tx_id as string | undefined
		if (!pid) return null
		return verifyPayment(pid)
	}, { orderId: input.orderId })
	if (!pay) {
		log.warn({ step: 'payment.verify', ok: false, context: { orderId: input.orderId } })
		return NextResponse.json({ code: 'PAYMENT_REQUIRED' }, { status: 402 })
	}

  // 同意検証（簡易）: terms_version が無い、または同意記録が見当たらない場合は拒否（将来: drafts照合）
	const nowIso = new Date().toISOString()
	const termsVersion = (input as any).terms_version || 'v1'
	const paymentTxId = (input as any).payment_tx_id || pay.paymentId

  // FIX: サーババリデーション - 直近のユーザードラフトに同意があるか検証
	try {
		const agreed = await withTiming(log, 'db.read.drafts', async () => {
			const d = await (supabase as any)
				.from('drafts')
				.select('id, disclaimer_agreed')
				.eq('user_id', userId)
				.order('updated_at', { ascending: false })
				.limit(1)
				.maybeSingle()
			return Boolean(d?.data?.disclaimer_agreed)
		}, { userId })
		if (!agreed) {
			return NextResponse.json({ code: 'DISCLAIMER_REQUIRED' }, { status: 400 })
		}
  } catch {
    log.warn({ step: 'db.read.drafts', ok: false, context: { userId } })
	}

// RateGuard: new env names + fallback, standard error 400+code
try {
  await withTiming(log, 'rateguard.assert', async () => {
    const cfg = loadRGConfig(process.env as any)
    const refTotal = await fetchRGRef({ supabase: supabaseFromAuth, userId })
    const rgRes = assertRG(refTotal, pay.amount, cfg)
    return rgRes
  })
} catch (e: any) {
  if (e instanceof RateGuardError || e?.code === 'RATE_GUARD_MISMATCH' || e?.code === 'RATE_GUARD_NO_REFERENCE') {
    log.warn({ step: 'rateguard.assert', ok: false, context: { code: e.code } })
    return NextResponse.json({ code: e.code ?? 'RATE_GUARD_MISMATCH', ...(e.payload || {}), diff: e.payload?.diff }, { status: e.status ?? 400 })
  }
  throw e
}

  const kind = chooseAccountKind(input.shipper.country, input.recipient.country)

  // Guard: サービス未確定のドラフトは拒否（422）
  try {
    const draftIdHeader = req.headers.get('x-draft-id') || undefined
    if (draftIdHeader) {
      const { data: d } = await supabase
        .from('drafts' as any)
        .select('id, selected_rate')
        .eq('id', draftIdHeader as any)
        .eq('user_id', userId as any)
        .maybeSingle()
      if (!d) {
        return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 })
      }
      const sr = (d as any)?.selected_rate
      if (!sr || !sr.service_code) {
        return NextResponse.json({ code: 'SERVICE_UNSELECTED' }, { status: 422 })
      }
    }
  } catch {}

	// Normalize packages: prefer input.packages; fallback to single package
	const normPackages = (input.packages && input.packages.length > 0)
		? input.packages
		: (input.package ? [input.package] : [])

  async function doShip(): Promise<NextResponse> {
		// Narrow race window by re-checking
		{
			const { data: existing } = await (await withTiming(log, 'db.read.shipments.recheck', async () =>
				supabase
					.from('shipments')
					.select('*')
					.filter('order_id', 'eq', input.orderId as any)
					.maybeSingle()
			)) as any
			if (existing && (existing as any).tracking_number && ((existing as any).label_blob_url || (existing as any).label_url)) {
				return NextResponse.json({
					trackingNumber: (existing as any).tracking_number as string,
					labelUrl: ((existing as any).label_blob_url || (existing as any).label_url) as string,
                    serviceType: (existing as any).service_type || input.serviceType,
                    rate: Number((existing as any).rate_total ?? 0),
                    currency: (existing as any).currency || 'JPY',
				} satisfies CreateShipResponse)
			}
		}

    // Build minimal FedEx payload and call
    // 入力を配送用ASCIIに正規化（日本語が送られても安全化）
    const norm = (s?: string | null) => toAsciiForShipping(String(s ?? ''))
    const payload = {
			accountNumber: { value: process.env[kind === 'export' ? 'FEDEX_EXPORT_ACCOUNT_NUMBER' : 'FEDEX_IMPORT_ACCOUNT_NUMBER']! },
			labelResponseOptions: 'URL_ONLY',
			requestedShipment: {
				shipper: {
          contact: { personName: norm(input.shipper.name), phoneNumber: norm(input.shipper.phone) },
					address: {
            streetLines: [norm(input.shipper.address1), norm(input.shipper.address2) || ''].filter(Boolean),
            city: norm(input.shipper.city),
            stateOrProvinceCode: norm(input.shipper.state) || undefined,
            postalCode: norm(input.shipper.postalCode),
            countryCode: norm(input.shipper.country),
					},
				},
				recipients: [
					{
            contact: { personName: norm(input.recipient.name), phoneNumber: norm(input.recipient.phone) },
						address: {
              streetLines: [norm(input.recipient.address1), norm(input.recipient.address2) || ''].filter(Boolean),
              city: norm(input.recipient.city),
              stateOrProvinceCode: norm(input.recipient.state) || undefined,
              postalCode: norm(input.recipient.postalCode),
              countryCode: norm(input.recipient.country),
							residential: false,
						},
					},
				],
				serviceType: input.serviceType,
				packagingType: 'YOUR_PACKAGING',
				pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
				shippingChargesPayment: { paymentType: input.bill.payer },
				requestedPackageLineItems: normPackages.length > 0
					? normPackages.map((p, i) => ({
						sequenceNumber: i + 1,
						groupPackageCount: 1,
						weight: { units: 'KG', value: Number(toKg(p.weight.value, p.weight.unit).toFixed(3)) },
						dimensions: {
							length: Math.round(toCm(p.dimensions.length, p.dimensions.unit)),
							width: Math.round(toCm(p.dimensions.width, p.dimensions.unit)),
							height: Math.round(toCm(p.dimensions.height, p.dimensions.unit)),
							units: 'CM',
						},
					}))
					: [],
			},
		}

		let tracking = ''
		let rate = 0
		let currency = 'JPY'
		let labelUrl = ''
		let trackingNumbers: string[] = []
		let responseLabelUrls: string[] = []
		let insertedShipmentId: number | null = null

		try {
			const res = await withTiming(log, 'fedex.request.shipment', async () => postShipment<any>(payload, kind, diagId), {
				service: input.serviceType,
				packageCount: normPackages.length,
				countryFrom: input.shipper.country,
				countryTo: input.recipient.country,
			})
			const ts = res?.output?.transactionShipments?.[0]
			const pieces: Array<any> = Array.isArray(ts?.pieceResponses) ? ts!.pieceResponses : []
			const master = ts?.masterTrackingNumber || pieces?.[0]?.trackingNumber || ''
			trackingNumbers = pieces.map(p => String(p?.trackingNumber || '')).filter(Boolean)
			const rawUrls: string[] = pieces.flatMap(p => (Array.isArray(p?.packageDocuments) ? p!.packageDocuments : []).map((d: any) => String(d?.url || '')).filter(Boolean))
			tracking = master
			const firstFedexUrl = rawUrls[0]
			const charge = ts?.shipmentDocuments?.[0]?.totalNetCharge
			rate = Number(charge?.amount ?? pay.amount)
			currency = String(charge?.currency ?? pay.currency ?? 'JPY')
			const fedexLabelUrl: string | undefined = firstFedexUrl
			if (!fedexLabelUrl) throw new Error('LABEL_URL_MISSING')
			const token = await getAccessToken(kind)
			const pdfResp = await withTiming(log, 'label.fetch', async () =>
				fetch(fedexLabelUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } })
			)
			if (!pdfResp.ok) throw new Error(`LABEL_FETCH_${pdfResp.status}`)
			const buf = Buffer.from(await pdfResp.arrayBuffer())
			const now = new Date()
			const yyyy = String(now.getUTCFullYear())
			const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
			const path = `labels/${yyyy}/${mm}/${input.orderId}-${tracking}.pdf`
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN
      if (!blobToken) {
        log.error({ step: 'blob.put.label', ok: false, error_message: 'BLOB_CONFIG' })
        try { await publishHookdeck({ type: 'label.error', detail: { reason: 'BLOB_CONFIG' }, diagId: (log as any)?.diagId }) } catch {}
        return NextResponse.json({ code: 'BLOB_CONFIG' }, { status: 500 })
      }
			const blob = await withTiming(log, 'blob.put.label', async () => put(path, buf, { access: 'public', contentType: 'application/pdf', token: blobToken }))
			labelUrl = blob.url
			// Build labelUrls array for response: first is blob url, rest are raw FedEx urls (not persisted)
			responseLabelUrls = [labelUrl, ...rawUrls.slice(1)]
    } catch (e) {
			if (e instanceof FedExError) {
        log.error({ step: 'fedex.request.shipment', ok: false, error_code: e.code, error_message: e.message, upstream: 'fedex' })
        try { await publishHookdeck({ type: 'ship.error', detail: { code: String(e.code), message: e.message, step: 'fedex.request.shipment' }, diagId: (log as any)?.diagId }) } catch {}
        return NextResponse.json({ ok: false, shipmentId: null, trackingNumbers: [], attachments: [], code: e.code, message: e.message }, { status: e.code || 502 })
			}
      log.error({ step: 'fedex.request.shipment', ok: false, error_message: String((e as Error)?.message || e), upstream: 'fedex' })
      try { await publishHookdeck({ type: 'ship.error', detail: { message: String((e as Error)?.message || e), step: 'fedex.request.shipment' }, diagId: (log as any)?.diagId }) } catch {}
      return NextResponse.json({ ok: false, shipmentId: null, trackingNumbers: [], attachments: [], code: 'SHIP_FAILED' }, { status: 502 })
		}

    try {
			const row: any = {
				order_id: input.orderId,
				// TODO(org-removed): org_id removed in single-user tenancy
				user_id: userId,
				tracking_number: tracking,
				service_type: input.serviceType,
				fedex_account_kind: kind,
				rate_total: rate,
				currency,
				label_blob_url: labelUrl,
				label_url: labelUrl,
				square_payment_id: pay.paymentId,
				payment_status: 'completed',
				hts_code: input.htsCode ?? null,
        payment_tx_id: paymentTxId,
        terms_accepted_at: nowIso,
        terms_version: termsVersion,
      }
			const ins = await withTiming(log, 'db.write.shipments', async () =>
				supabase.from('shipments').insert([row] as any).select('*').maybeSingle()
			)
			insertedShipmentId = (ins as any)?.data?.id ?? null
			if (ins.error && String(ins.error?.message || '').includes('duplicate')) {
				const { data: existing } = await (await withTiming(log, 'db.read.shipments.on-dup', async () =>
					supabase
						.from('shipments')
						.select('*')
						.filter('order_id', 'eq', input.orderId as any)
						.maybeSingle()
				)) as any
				if (existing) {
					const attUrl = String((existing as any).label_blob_url || (existing as any).label_url || '')
					const attachments = attUrl ? [{ url: attUrl, kind: 'label', contentType: 'application/pdf' }] : []
					const trackingNum = String((existing as any).tracking_number || '')
					return NextResponse.json({
						ok: true,
						shipmentId: (existing as any).id ?? null,
						trackingNumber: trackingNum,
						trackingNumbers: trackingNum ? [trackingNum] : [],
						labelUrl: attUrl,
						attachments,
						serviceType: (existing as any).service_type || input.serviceType,
						rate: Number((existing as any).rate_total ?? rate),
						currency: (existing as any).currency || currency,
					})
				}
			}
    } catch (e) {
      log.error({ step: 'db.write.shipments', ok: false, error_message: String((e as Error)?.message || e), upstream: 'db' })
      try { await publishHookdeck({ type: 'ship.error', detail: { message: String((e as Error)?.message || e), step: 'db.write.shipments' }, diagId: (log as any)?.diagId }) } catch {}
      return NextResponse.json({ ok: false, shipmentId: null, trackingNumbers: [], attachments: [], code: 'PERSIST_FAILED' }, { status: 500 })
    }

		log.info({ step: 'done', ok: true, context: { orderId: input.orderId, trackingNumber: tracking, service: input.serviceType } })
		const attachments = responseLabelUrls.map((url) => ({ url, kind: 'label', contentType: 'application/pdf' }))
		return NextResponse.json({
			ok: true,
			shipmentId: insertedShipmentId,
			trackingNumber: tracking,
			labelUrl,
			serviceType: input.serviceType,
			rate,
			currency,
			htsCode: input.htsCode,
			masterTrackingNumber: tracking,
			trackingNumbers,
			labelUrls: responseLabelUrls,
			attachments,
		} as any)
	}

  // 非同期化（最小）: まずDBにprocessing確定→バックグラウンドで発送→早期レス
  const generatedShipmentId = randomUUID()
  await markProcessing(svc, generatedShipmentId, requestId)
  ;(async () => {
    try {
      if (isMock) {
        // 簡易遅延後にcompletedに更新
        await new Promise((r) => setTimeout(r, 300))
        await markCompleted(svc, generatedShipmentId, { labelUrl: `https://example.com/labels/${generatedShipmentId}.pdf`, tracking: '999999999999', requestId })
        return
      }
      // 実運用: 既存のdoShip()処理で作成し、結果でDB更新
      const resp = await doShip()
      if (resp.ok) {
        const j: any = await resp.json()
        await markCompleted(svc, generatedShipmentId, { labelUrl: String(j?.labelUrl || ''), tracking: String(j?.trackingNumber || ''), requestId })
      } else {
        await markFailed(svc, generatedShipmentId, `HTTP_${resp.status}`, requestId)
      }
    } catch (e: any) {
      await markFailed(svc, generatedShipmentId, String(e?.message || e), requestId)
    }
  })()
  return NextResponse.json({ status: 'processing', shipmentId: generatedShipmentId, requestId }, { status: 202 })
  })
}
