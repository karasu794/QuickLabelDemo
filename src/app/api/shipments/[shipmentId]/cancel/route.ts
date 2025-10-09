import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: { shipmentId: string } }) {
  const { shipmentId } = params
  if (!shipmentId) {
    return NextResponse.json({ error: 'shipmentIdが指定されていません' }, { status: 400 })
  }
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'ユーザー認証に失敗しました' }, { status: 401 })

    const { data, error } = await (supabase.rpc('cancel_shipment', { p_shipment_id: shipmentId }) as any)
    if (error) {
      const msg = String(error.message || '').toLowerCase()
      if (msg.includes('not_found')) return NextResponse.json({ error: 'not found' }, { status: 404 })
      if (msg.includes('forbidden')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, data: data ?? { ok: true } })
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
