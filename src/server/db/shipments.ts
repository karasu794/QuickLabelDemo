export type ShipmentStatus = 'processing' | 'completed' | 'failed'

export async function markProcessing(supabase: any, shipmentId: string, requestId: string) {
  return supabase.from('shipments' as any).upsert({ id: shipmentId, status: 'processing', request_id: requestId }, { onConflict: 'id' } as any)
}

export async function markCompleted(supabase: any, shipmentId: string, data: { labelUrl: string; tracking?: string | null; requestId: string }) {
  return supabase
    .from('shipments' as any)
    .update({ status: 'completed', label_url: data.labelUrl, tracking: data.tracking ?? null, request_id: data.requestId })
    .eq('id', shipmentId as any)
}

export async function markFailed(supabase: any, shipmentId: string, error: string, requestId: string) {
  return supabase
    .from('shipments' as any)
    .update({ status: 'failed', error, request_id: requestId })
    .eq('id', shipmentId as any)
}

export async function getStatus(supabase: any, shipmentId: string) {
  return supabase.from('shipments' as any).select('status,label_url').eq('id', shipmentId as any).maybeSingle()
}


