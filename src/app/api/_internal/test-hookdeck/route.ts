import { NextRequest, NextResponse } from 'next/server'
import { publishHookdeck } from '@/lib/observability/hookdeck'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  if (process.env.ALLOW_TEST_ROUTES !== 'true') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 404 })
  }
  const { type, detail } = await req.json().catch(() => ({ })) as { type?: string, detail?: any }
  if (!type) return NextResponse.json({ ok: false, error: 'type_required' }, { status: 400 })
  const res = await publishHookdeck({ type, detail })
  return NextResponse.json(res, { status: res.ok ? 200 : 500 })
}


