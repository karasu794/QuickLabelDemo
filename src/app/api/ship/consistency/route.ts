import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'

// READ ONLY集約: trackingNumber または orderId を受け取り、shipments を基点に付随情報を返す
// 制約: DBスキーマ変更なし。labels/attachments/email_logs テーブルが無い前提では、label_url を attachments にマッピングして返却

type Params = {
  trackingNumber?: string
  orderId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Params
    const trackingNumber = String(body?.trackingNumber || '').trim()
    const orderId = String(body?.orderId || '').trim()

    if (!trackingNumber && !orderId) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 })
    }

    // 認証ユーザーの可視性に配慮するが、最終整合のため service role で実行
    const sb = createServiceRoleClient()

    // shipments を検索
    let q = (sb as any).from('shipments').select('*').limit(1)
    if (trackingNumber) q = q.eq('tracking_number', trackingNumber)
    if (!trackingNumber && orderId) q = q.eq('order_id', orderId)

    const { data: s, error } = await q.maybeSingle()
    if (error || !s) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 })
    }

    const attUrl = String(s.label_blob_url || s.label_url || '')
    const attachments = attUrl ? [{ url: attUrl, kind: 'label', contentType: 'application/pdf' }] : []

    return NextResponse.json({
      ok: true,
      shipmentId: s.id ?? null,
      trackingNumber: s.tracking_number || trackingNumber || null,
      labelUrl: attUrl || null,
      labelUrls: attUrl ? [attUrl] : [],
      attachments,
      paymentStatus: s.payment_status || null,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, code: 'CONSISTENCY_ERROR' }, { status: 500 })
  }
}


