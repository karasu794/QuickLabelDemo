import { Suspense } from 'react'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { evaluateSuccessGate } from '@/lib/successGate'

export default async function SuccessPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  try {
    if (process.env.SUCCESS_GATE_ENFORCE === 'true') {
      const sb = createServiceRoleClient()
      const sid = (typeof searchParams?.shipmentId === 'string'
        ? searchParams?.shipmentId
        : Array.isArray(searchParams?.shipmentId)
        ? searchParams?.shipmentId[0]
        : undefined) || ''
      if (sid) {
        const { data } = await (sb as any)
          .from('shipments')
          .select('payment_status, tracking_number, label_blob_url, label_url')
          .eq('id', sid as any)
          .maybeSingle()
        const gate = evaluateSuccessGate({
          paymentStatus: (data as any)?.payment_status ?? null,
          trackingNumber: (data as any)?.tracking_number ?? null,
          labelBlobUrl: ((data as any)?.label_blob_url || (data as any)?.label_url) ?? null,
        })
        if (!gate.pass) {
          const reason = gate.reasons[0] || 'unknown'
          redirect(`/shipping/new/review?reason=${reason}&sid=${encodeURIComponent(sid)}`)
        }
      }
    }
  } catch {}
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="max-w-2xl mx-auto">ページを読み込み中...</div></div>}>
      <ClientPage />
    </Suspense>
  )
} 