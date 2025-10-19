import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.APP_ENV || null,
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    guarded: true,
    ts: new Date().toISOString(),
  })
}
