export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode, resolveDemoUser, createDemoSession } from '@/lib/demo/auth'

export async function POST(req: NextRequest) {
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

  // ─── Demo mode: ローカル認証のみ（Supabaseアクセスなし） ───
  if (isDemoMode) {
    const demoUser = resolveDemoUser(email)
    if (!demoUser) {
      return NextResponse.json(
        { error: 'デモ環境では登録済みデモアカウントのみログインできます。' },
        { status: 401 }
      )
    }
    // デモ用パスワード検証（環境変数と照合）
    const expectedPassword =
      demoUser.role === 'admin'
        ? process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD
        : process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD
    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードをご確認ください。' },
        { status: 401 }
      )
    }
    const session = createDemoSession(demoUser)
    return NextResponse.json({
      ok: true,
      user: session.user,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }, { status: 200 })
  }

  // ─── Production mode: Supabase認証 ───
  const { createRouteClient } = await import('@/lib/supabase/routeClient')
  const supabase = createRouteClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.warn('[sign-in] failed:', { code: (error as any)?.status || 401 })
    return NextResponse.json({ error: 'メールアドレスまたはパスワードをご確認ください。' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    user: data.user,
    access_token: data.session?.access_token,
    refresh_token: (data as any)?.session?.refresh_token,
  }, { status: 200 })
}
