import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.APP_ENV,
    openai: !!process.env.OPENAI_API_KEY,
    supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ts: new Date().toISOString(),
  });
}
