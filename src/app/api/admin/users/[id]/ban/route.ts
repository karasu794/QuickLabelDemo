import { NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit'
import { ensureAdminUserActionAllowed } from '@/lib/admin/guards'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Demo mode guard
  if (process.env.APP_ENV === 'demo') {
    return NextResponse.json({ ok: false, code: 'DEMO_MODE_DISABLED', message: 'この操作（ユーザーBAN）はデモ環境では無効です。' }, { status: 403 })
  }

  const auth = await requireAdminAuthRoute()
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 'status' in auth ? auth.status : 403 })

  const targetId = params.id
  if (!targetId) return NextResponse.json({ ok: false, error: 'bad_request', code: 'NO_ID' }, { status: 400 })

  const body = await req.json().catch(() => ({} as any))
  const reason: string | undefined = typeof body?.reason === 'string' ? body.reason : undefined

  const supabase = createServiceRoleClient()
  const gate = await ensureAdminUserActionAllowed({ supabaseSR: supabase, actorId: auth.user!.id, targetId, action: 'ban' })
  if (!gate.ok) return NextResponse.json({ ok: false, code: (gate as any).code }, { status: (gate as any).status })
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ is_banned: true, suspended_until: null } as any)
    .eq('id', targetId)
  if (error) return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 })

  await logAdminAction({ actorId: auth.user!.id, targetUserId: targetId, action: 'ban', reason: reason ?? null })

  return NextResponse.json({ ok: true })
}


