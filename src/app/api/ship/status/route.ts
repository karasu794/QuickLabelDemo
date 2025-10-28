import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient as createSvc } from '@supabase/supabase-js'
import { getStatus } from '@/server/db/shipments'
import { withTrace } from '@/lib/trace'

// GET /api/ship/status?shipmentId=...
export async function GET(request: NextRequest) {
  return withTrace('api.ship.status', request, async () => {
    try {
      const url = new URL(request.url)
      const shipmentId = url.searchParams.get('shipmentId')
      if (!shipmentId) {
        return NextResponse.json({ status: 'failed', error: 'MISSING_SHIPMENT_ID' }, { status: 400 })
      }
      // Mock fast-path
      const cookieHeader = request.headers.get('cookie') || ''
      const hasMockCookie = /(?:^|;\s*)core-mode=mock(?:;|$)/i.test(cookieHeader)
      const envCoreMode = String(process.env.CORE_MODE || '').toLowerCase() === 'mock'
      if (hasMockCookie || envCoreMode || shipmentId.startsWith('mock-')) {
        return NextResponse.json({ status: 'completed', labelUrl: 'https://example.com/mock-label.pdf', trackingNumber: '999999999999' }, { status: 200 })
      }
      const supabase = createServiceRoleClient()
      const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data, error } = await getStatus(svc, shipmentId)
      if (error) {
        return NextResponse.json({ status: 'failed', error: 'DB_ERROR' }, { status: 500 })
      }
      if (!data) {
        return NextResponse.json({ status: 'failed', error: 'NOT_FOUND' }, { status: 404 })
      }
      const labelUrl = (data as any)?.label_blob_url || (data as any)?.label_url || ''
      const isCompleted = (data as any)?.payment_status === 'completed' && !!labelUrl
      if (!isCompleted) {
        return NextResponse.json({ status: 'processing' as const }, { status: 200 })
      }
      return NextResponse.json({ status: 'completed' as const, labelUrl, trackingNumber: (data as any).tracking_number || null }, { status: 200 })
    } catch (e) {
      return NextResponse.json({ status: 'failed', error: 'INTERNAL' }, { status: 500 })
    }
  })
}


