import { NextRequest, NextResponse } from 'next/server'
import { publishHookdeck } from '@/lib/observability/hookdeck'

export const runtime = 'edge'

// 既存の差し込みルールにならって、手動で各種エラー通知を発火
export async function POST(req: NextRequest) {
  if (process.env.ALLOW_TEST_ROUTES !== 'true') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 404 })
  }
  const { kind } = await req.json().catch(() => ({ })) as { kind?: string }
  try {
    if (kind === 'payment') {
      await publishHookdeck({ type: 'payment.error', detail: { code: 'TEST_PAYMENT_FAIL', phase: 'payments.charge', note: 'triggered by /_internal/trigger-error' } })
      return NextResponse.json({ ok: false, injected: 'payment.error' }, { status: 402 })
    }
    if (kind === 'ship') {
      await publishHookdeck({ type: 'ship.error', detail: { code: 'TEST_SHIP_FAIL', step: 'fedex.request.shipment', note: 'triggered by /_internal/trigger-error' } })
      return NextResponse.json({ ok: false, injected: 'ship.error' }, { status: 502 })
    }
    if (kind === 'label') {
      await publishHookdeck({ type: 'label.error', detail: { phase: 'fetch', message: 'TEST_LABEL_FETCH_FAIL', note: 'triggered by /_internal/trigger-error' } })
      return NextResponse.json({ ok: false, injected: 'label.error' }, { status: 500 })
    }
    return NextResponse.json({ ok: false, error: 'unknown_kind' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}


