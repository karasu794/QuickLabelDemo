import { ok, err, type Result } from '@/lib/result'
import { createClient } from '@supabase/supabase-js'

export async function sendShipmentMail(params: { shipmentId: string; to: string; subject: string; body: string; requestId: string }): Promise<Result<{ messageId: string }, string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(url, key)
  try {
    // 実メール送信は既存プロバイダに委譲（ここではモックIDを生成）
    const messageId = `mock-msg-${params.shipmentId}`
    await supabase.from('shipment_emails' as any).insert({ shipment_id: params.shipmentId, message_id: messageId, status: 'sent', request_id: params.requestId })
    return ok({ messageId })
  } catch (e: any) {
    await supabase.from('shipment_emails' as any).insert({ shipment_id: params.shipmentId, status: 'queued_for_retry', error: String(e?.message ?? e), request_id: params.requestId })
    return err(String(e?.message ?? e))
  }
}


