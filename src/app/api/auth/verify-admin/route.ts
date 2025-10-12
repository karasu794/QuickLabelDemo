import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/routeClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function GET() {
  try {
    // Route Handler では cookie 書き換えが許可されるため、公式ヘルパを利用
    const supabase = createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    let isAdmin = false
    if (user) {
      const email = (user.email || '').toLowerCase()
      if (email && adminEmails.includes(email)) {
        isAdmin = true
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role,is_admin')
          .eq('id', user.id)
          .maybeSingle()
        const p: any = profile || {}
        const roleNormalized = String(p.role ?? '').trim().toLowerCase()
        isAdmin = p.is_admin === true || roleNormalized === 'admin'
      }
    }

    const ctx = {
      isAuthenticated: Boolean(user),
      isAdmin,
      user,
    }
    return NextResponse.json({
      ok: true,
      authenticated: ctx.isAuthenticated,
      isAdmin: ctx.isAdmin,
      user: ctx.user ? { id: ctx.user.id, email: (ctx.user as any).email ?? null } : null,
      source: 'isAdmin',
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        code: 'ADMIN_VERIFY_ERROR',
        message: err?.message ?? String(err),
      },
      { status: 500 }
    )
  }
}