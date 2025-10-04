export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient()

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body || {}
  if (!email || !password) {
    return NextResponse.json({ error: 'email と password は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    user: data.user,
    access_token: data.session?.access_token,
    refresh_token: (data as any)?.session?.refresh_token,
  }, { status: 200 })
}


