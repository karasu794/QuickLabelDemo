import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { publishHookdeck } from '@/lib/observability/hookdeck'
import { normalizeJPYAmount } from '@/lib/vendors/square/amount'

// DIAG: 同意保存との連携なし。paymentIdは返却しているが、同意状態（draftやterms_version）とは未連携。
// DIAG: レスポンスに paymentId はあるため payment_tx_id として流用可能。

const schema = z.object({
  orderId: z.string().min(1),
  // 小数は受け入れ（後段でJPY仕様に基づき四捨五入→整数化）
  amount: z.number(),
  currency: z.literal('JPY'),
  // 入力エラーは明示コード（SOURCE_REQUIRED/LOCATION_REQUIRED）で返すため任意→手動検証
  token: z.string().optional(),
  locationId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const diagId = req.headers.get('x-request-id') || req.headers.get('X-Request-Id') || req.headers.get('x-diag-id') || undefined
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    try { await publishHookdeck({ type: 'payment.error', detail: { code: 'QL-JSON', message: '無効なJSONです' }, diagId }) } catch {}
    return NextResponse.json({ ok: false, code: 'QL-JSON', message: '無効なJSONです' }, { status: 400 })
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string[]> = {}
    parsed.error.issues.forEach(i => {
      const k = (i.path[0] as string) || 'root'
      errors[k] = [...(errors[k] || []), i.message]
    })
    try { await publishHookdeck({ type: 'payment.error', detail: { code: 'VALIDATION_ERROR', errors }, diagId }) } catch {}
    return NextResponse.json({ ok: false, code: 'VALIDATION_ERROR', errors }, { status: 422 })
  }
  const { orderId, amount, currency } = parsed.data
  const locationId = parsed.data.locationId || ''
  const token = parsed.data.token || ''

  const sb = createServiceRoleClient()

  // Idempotency: if a shipment already has a payment id for this order, reuse it
  const { data: existing } = await (sb as any).from('shipments').select('square_payment_id').eq('order_id', orderId).maybeSingle()
  if (existing?.square_payment_id) {
    // FIX: 既存paymentIdを payment_tx_id としても利用可能
    return NextResponse.json({ ok: true, paymentId: existing.square_payment_id, status: 'PENDING', amount, currency, orderId })
  }

  // If Square config not present, simulate payment id for local/dev and set pending
  // 金額は常にJPY仕様で正規化（四捨五入→正の整数）。
  let amountInt = 0
  let amountBig: bigint | null = null
  try {
    const n = normalizeJPYAmount(amount)
    amountInt = n.amountInt
    amountBig = n.amountBig
  } catch (e: any) {
    const msg = String(e?.message || e)
    try { await publishHookdeck({ type: 'payment.error', detail: { code: 'INVALID_AMOUNT', message: msg, phase: 'payments.charge' }, diagId }) } catch {}
    return NextResponse.json({ ok: false, code: 'INVALID_AMOUNT', message: msg }, { status: 400 })
  }

  const hasSquare = !!process.env.SQUARE_ACCESS_TOKEN
  let paymentId = `local_${randomUUID()}`
  let status: string = 'PENDING'

  if (hasSquare) {
    // --- 入力検証（環境とリクエスト） ---
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      try { await publishHookdeck({ type: 'payment.error', detail: { code: 'SQUARE_CONFIG', message: 'missing SQUARE_ACCESS_TOKEN' }, diagId }) } catch {}
      return NextResponse.json({ ok: false, code: 'SQUARE_CONFIG', message: 'missing SQUARE_ACCESS_TOKEN' }, { status: 500 })
    }
    if (!locationId) {
      try { await publishHookdeck({ type: 'payment.error', detail: { code: 'LOCATION_REQUIRED', message: 'Square locationId is required' }, diagId }) } catch {}
      return NextResponse.json({ ok: false, code: 'LOCATION_REQUIRED', message: 'locationId required' }, { status: 400 })
    }
    if (!token) {
      try { await publishHookdeck({ type: 'payment.error', detail: { code: 'SOURCE_REQUIRED', message: 'Square sourceId(token) is required' }, diagId }) } catch {}
      return NextResponse.json({ ok: false, code: 'SOURCE_REQUIRED', message: 'sourceId required' }, { status: 400 })
    }

    try {
      // JPYはsmallest unit整数。SDK直前のみBigInt化（アプリ内部はnumberを維持）
      // 根拠: docs/vendors/square/reference.md → CreatePayment / AmountMoney（amount=smallest unit integer、JPY=0小数）
      // 参照: docs/vendors/square/openapi.json の /v2/payments スキーマ
      const { SquareClient } = await import('square') as any
      const client = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' })
      const idempotencyKey = `fql-${orderId}` // 同一注文の重複課金を防止

      const resp = await client.payments.create({
        sourceId: token,
        idempotencyKey,
        locationId,
        amountMoney: { amount: amountBig as bigint, currency: 'JPY' as const },
      })

      paymentId = String(resp?.payment?.id || paymentId)
      status = String(resp?.payment?.status || 'PENDING')
    } catch (e: any) {
      const msg = String(e?.message || e)
      const code = /bigint/i.test(msg) ? 'AMOUNT_TYPE_ERROR' : 'SQUARE_ERROR'
      try { await publishHookdeck({ type: 'payment.error', detail: { code, message: msg, phase: 'payments.charge' }, diagId }) } catch {}
      return NextResponse.json({ ok: false, code, message: msg }, { status: 500 })
    }
  }

  // Persist lightweight pending info on shipments (方式B) for now
  await (sb as any)
    .from('shipments')
    .update({ square_payment_id: paymentId, payment_status: status.toLowerCase() } as any)
    .eq('order_id', orderId as any)

  // FIX: paymentId を明示返却（payment_tx_id として利用）
  // 応答は number を維持（BigIntは返さない）
  return NextResponse.json({ ok: true, paymentId, status, amount: amountInt, currency, orderId })
}


