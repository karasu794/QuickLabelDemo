import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.APP_ENV || null,
    isDemo: process.env.APP_ENV === 'demo',
    simulatePayment: Boolean(process.env.SIMULATE_PAYMENT),
    shipApiWriteEnabled: process.env.SHIP_API_WRITE_ENABLED === 'true',
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    guarded: true,
    ts: new Date().toISOString(),
  })
}
