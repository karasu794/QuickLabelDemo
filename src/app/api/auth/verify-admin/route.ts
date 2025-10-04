import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/auth/isAdmin'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Route Handler では cookie 書き換えが許可されるため、こちらを優先
    const supabase = createRouteHandlerClient()
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
        isAdmin = Boolean((profile as any)?.is_admin) || ((profile as any)?.role || '').toLowerCase() === 'admin'
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