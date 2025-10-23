import { NextRequest, NextResponse } from 'next/server'
import { withTrace } from '@/lib/trace'

// NOTE: This is a lightweight mock endpoint for E2E/UI wiring
export async function POST(request: NextRequest) {
  return withTrace('api.email.resend', request, async () => {
    try {
      const body = await request.json().catch(() => ({} as any))
      const shipmentId = String(body?.shipmentId || '')
      if (!shipmentId) return NextResponse.json({ ok: false, code: 'MISSING_SHIPMENT_ID' }, { status: 400 })
      // Rate limit: naive memory-based key (non-persistent in serverless; acceptable for mock)
      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 })
    }
  })
}


