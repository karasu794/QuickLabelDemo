import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFedExAccessToken, getFedExCredentialsByOrigin } from '@/lib/fedex/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { createAdminNotification } from '@/lib/admin/notifications'

type ServiceResult = { status: number; body: any }

export async function cancelShipmentByTrackingNumber(params: { trackingNumber: string; actorUserId: string }): Promise<ServiceResult> {
  const { trackingNumber, actorUserId } = params
  const supabase = createServiceRoleClient()

  // 1) 対象レコード取得
  const { data: shipment, error: fetchErr } = await supabase
    .from('shipments')
    .select('id, user_id, shipping_status, status, square_payment_id, total_amount')
    .eq('tracking_number', trackingNumber)
    .maybeSingle()

  if (fetchErr) return { status: 422, body: { ok: false, error: 'DB_ERROR', detail: fetchErr.message } }
  if (!shipment) return { status: 404, body: { ok: false, error: 'NOT_FOUND' } }

  const alreadyCancelled = String(shipment.shipping_status || shipment.status || '').toLowerCase().includes('cancel')
  if (alreadyCancelled) {
    return { status: 204, body: { ok: true, message: 'Already canceled' } }
  }

  // 2) 一時状態: cancel_requested
  await supabase
    .from('shipments')
    .update({ shipping_status: 'cancel_requested', updated_at: new Date().toISOString() } as any)
    .eq('tracking_number', trackingNumber)

  let fedexError: string | null = null
  let squareError: string | null = null
  let fedexResp: any = null
  let squareResp: any = null

  // 3) FedEx void（日本発送前提の既存仕様に合わせる）
  try {
    const accessToken = await getFedExAccessToken('JP')
    const credentials = getFedExCredentialsByOrigin('JP')
    const cancelUrl = 'https://apis.fedex.com/ship/v1/shipments/cancel'
    const cancelRequest = { accountNumber: { value: credentials.accountNumber }, trackingNumber }
    const res = await fetch(cancelUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'ja_JP',
      },
      body: JSON.stringify(cancelRequest),
    })
    const text = await res.text().catch(() => '')
    if (!res.ok) {
      fedexError = `FedEx ${res.status}`
    } else {
      try { fedexResp = text ? JSON.parse(text) : {} } catch { fedexResp = { raw: text } }
    }
  } catch (e: any) {
    fedexError = String(e?.message || e)
  }

  // 4) Square refund（あれば）
  if (shipment.square_payment_id) {
    try {
      const resp = await fetch('https://connect.squareupsandbox.com/v2/refunds', {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: `refund_${shipment.id}_${Date.now()}`,
          payment_id: shipment.square_payment_id,
          amount_money: { amount: Math.round(Number(shipment.total_amount || 0) * 100), currency: 'JPY' },
          reason: 'FedEx shipment cancelled',
        }),
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) squareError = body?.errors?.[0]?.detail || `Square ${resp.status}`
      else squareResp = body
    } catch (e: any) {
      squareError = String(e?.message || e)
    }
  }

  const success = !fedexError && (!shipment.square_payment_id || !squareError)

  // 5) 最終状態更新
  await supabase
    .from('shipments')
    .update({
      shipping_status: success ? 'cancelled' : 'cancel_failed',
      payment_status: shipment.square_payment_id ? (squareError ? 'refund_failed' : 'refunded') : null,
      refund_reason: shipment.square_payment_id ? 'FedEx shipment cancelled' : null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('tracking_number', trackingNumber)

  // 6) 監査（admin_actionsに記録）
  try {
    await logAdminAction({ actorId: actorUserId, targetUserId: String(shipment.user_id || ''), action: 'delete', payload: { trackingNumber, fedexError, squareError, fedexResp, squareResp } })
  } catch {}

  // 7) 管理通知（日本語メッセージ）
  try {
    const parts: string[] = []
    const fedexOk = !fedexError
    const squareOk = !shipment.square_payment_id || !squareError
    if (success) {
      parts.push('FedEx および Square のキャンセルが正常に完了しました。')
    } else {
      if (!fedexOk && squareOk) parts.push('FedEx のキャンセル処理に失敗しました。Square の返金は完了しています。')
      if (fedexOk && !squareOk) parts.push('FedEx のキャンセルは成功しましたが、Square の返金処理でエラーが発生しました。')
      if (!fedexOk && !squareOk) parts.push('FedEx および Square の処理が両方とも失敗しました。')
    }
    await createAdminNotification({
      title: `出荷キャンセル結果 (${trackingNumber})`,
      message: parts.join('\n'),
      level: success ? 'success' : 'error',
      actor_id: actorUserId,
      target_user_id: String(shipment.user_id || ''),
    })
  } catch {}

  return { status: success ? 200 : 207, body: { ok: success, fedexError, squareError } }
}


