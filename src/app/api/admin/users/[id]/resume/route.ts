import { NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit'
import { ensureAdminUserActionAllowed } from '@/lib/admin/guards'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminAuthRoute()
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 'status' in auth ? auth.status : 403 })

  const targetId = params.id
  if (!targetId) return NextResponse.json({ ok: false, error: 'bad_request', code: 'NO_ID' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const gate = await ensureAdminUserActionAllowed({ supabaseSR: supabase, actorId: auth.user!.id, targetId, action: 'resume' })
  if (!gate.ok) return NextResponse.json({ ok: false, code: (gate as any).code }, { status: (gate as any).status })
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ is_banned: false, suspended_until: null } as any)
    .eq('id', targetId)
  if (error) return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 })

  await logAdminAction({ actorId: auth.user!.id, targetUserId: targetId, action: 'resume' })

  return NextResponse.json({ ok: true })
}


