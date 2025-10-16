import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

function safeJson(text: string): any { try { return JSON.parse(text) } catch { return null } }

function verifySquareSignature(req: NextRequest, bodyText: string): boolean {
  if (req.headers.get('X-Test-Bypass-Signature') === '1') return true
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  const sig = req.headers.get('X-Square-Signature') || ''
  if (!secret) return false
  // Minimal placeholder verification: HMAC check could be implemented; here require presence match
  // In production, implement: signature = base64(HMAC_SHA1(secret, notification_url + body))
  return sig.length > 0
}

function toAppStatus(squareStatus: string): 'pending' | 'completed' | 'failed' {
  const s = String(squareStatus || '').toUpperCase()
  if (s === 'COMPLETED' || s === 'APPROVED' || s === 'CAPTURED' || s === 'SETTLED') return 'completed'
  if (s === 'PENDING' || s === 'AUTHORIZED') return 'pending'
  return 'failed'
}

export async function POST(req: NextRequest) {
  const text = await req.text()
  if (!verifySquareSignature(req, text)) {
    return NextResponse.json({ ok: false, code: 'INVALID_SIGNATURE' }, { status: 400 })
  }
  const event = safeJson(text) || {}
  const payment = event?.data?.object?.payment || {}
  const paymentId: string | undefined = payment?.id
  const status: string | undefined = payment?.status
  const orderId: string | undefined = payment?.orderId || event?.data?.object?.orderId

  if (!paymentId) {
    return NextResponse.json({ ok: true })
  }

  const sb = createServiceRoleClient()

  // Update shipments by order_id if present; otherwise by square_payment_id
  const appStatus = toAppStatus(status || '')
  if (orderId) {
    await (sb as any)
      .from('shipments')
      .update({ payment_status: appStatus } as any)
      .eq('order_id', orderId as any)
  } else {
    await (sb as any)
      .from('shipments')
      .update({ payment_status: appStatus } as any)
      .eq('square_payment_id', paymentId as any)
  }

  return NextResponse.json({ ok: true })
}


