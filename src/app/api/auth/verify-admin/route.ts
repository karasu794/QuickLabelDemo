import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/auth/isAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const ctx = await getAdminContext()
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