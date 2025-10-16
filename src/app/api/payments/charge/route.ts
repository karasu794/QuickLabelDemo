import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

const schema = z.object({
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.literal('JPY'),
  token: z.string().min(1),
  locationId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'QL-JSON', message: '無効なJSONです' }, { status: 400 })
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string[]> = {}
    parsed.error.issues.forEach(i => {
      const k = (i.path[0] as string) || 'root'
      errors[k] = [...(errors[k] || []), i.message]
    })
    return NextResponse.json({ ok: false, code: 'VALIDATION_ERROR', errors }, { status: 422 })
  }
  const { orderId, amount, currency, token, locationId } = parsed.data

  const sb = createServiceRoleClient()

  // Idempotency: if a shipment already has a payment id for this order, reuse it
  const { data: existing } = await sb.from('shipments').select('square_payment_id').eq('order_id', orderId).maybeSingle()
  if (existing?.square_payment_id) {
    return NextResponse.json({ ok: true, paymentId: existing.square_payment_id, status: 'PENDING', amount, currency, orderId })
  }

  // If Square config not present, simulate payment id for local/dev and set pending
  const hasSquare = !!process.env.SQUARE_ACCESS_TOKEN && !!process.env.SQUARE_LOCATION_ID
  let paymentId = `local_${randomUUID()}`
  let status: string = 'PENDING'

  if (hasSquare) {
    try {
      const { SquareClient } = await import('square') as any
      const client = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' })
      const idempotencyKey = `fql-${orderId}`
      const resp = await client.payments.create({
        sourceId: token,
        idempotencyKey,
        locationId,
        amountMoney: { amount: BigInt(amount), currency: 'JPY' as const },
      })
      paymentId = String(resp?.payment?.id || paymentId)
      status = String(resp?.payment?.status || 'PENDING')
    } catch (e: any) {
      // SDK/config error
      return NextResponse.json({ ok: false, code: 'SQUARE_ERROR', message: String(e?.message || e) }, { status: 500 })
    }
  }

  // Persist lightweight pending info on shipments (方式B) for now
  await sb.from('shipments').update({ square_payment_id: paymentId, payment_status: status.toLowerCase() }).eq('order_id', orderId)

  return NextResponse.json({ ok: true, paymentId, status, amount, currency, orderId })
}


