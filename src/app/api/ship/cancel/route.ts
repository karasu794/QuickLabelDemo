import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'
import { cancelShipmentByTrackingNumber } from '@/lib/ship/cancelShipmentService'

// QUICK_FIX: ダミー応答ルート
// 目的: 旧参照パス /api/ship/cancel でタイムアウトせず、即時に原因可視化（501）する
// 認可: 現状のポリシーに合わせ Admin のみ到達可能（非Adminは 403）
// TODO(admin-cancel): implement real FedEx void + Square refund + DB state machine

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuthRoute()
  if (!auth.ok) {
    const status = 'status' in auth ? auth.status : 403
    return NextResponse.json({ ok: false, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status })
  }
  try {
    const json = await req.json().catch(() => ({}))
    const trackingNumber = String(json?.trackingNumber || json?.tracking_number || '')
    if (!trackingNumber) return NextResponse.json({ ok: false, error: 'MISSING_TRACKING_NUMBER' }, { status: 400 })
    const res = await cancelShipmentByTrackingNumber({ trackingNumber, actorUserId: auth.user.id })
    return NextResponse.json(res.body, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, { status: 405 })
}

export async function PUT() { return GET() }
export async function DELETE() { return GET() }
