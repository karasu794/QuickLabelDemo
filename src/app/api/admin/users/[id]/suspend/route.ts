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
    return NextResponse.json({ ok: false, code: 'DEMO_MODE_DISABLED', message: 'この操作（ユーザー停止）はデモ環境では無効です。' }, { status: 403 })
  }

  const auth = await requireAdminAuthRoute()
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 'status' in auth ? auth.status : 403 })

  const targetId = params.id
  if (!targetId) return NextResponse.json({ ok: false, error: 'bad_request', code: 'NO_ID' }, { status: 400 })

  const body = await req.json().catch(() => ({} as any))
  const untilStr: string | undefined = typeof body?.until === 'string' ? body.until : undefined
  const reason: string | undefined = typeof body?.reason === 'string' ? body.reason : undefined

  if (!untilStr) return NextResponse.json({ ok: false, error: 'bad_request', code: 'NO_UNTIL' }, { status: 400 })
  const until = new Date(untilStr)
  if (!(until instanceof Date) || isNaN(until.valueOf())) return NextResponse.json({ ok: false, error: 'bad_request', code: 'INVALID_UNTIL' }, { status: 400 })
  if (until <= new Date()) return NextResponse.json({ ok: false, error: 'bad_request', code: 'PAST_UNTIL' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const gate = await ensureAdminUserActionAllowed({ supabaseSR: supabase, actorId: auth.user!.id, targetId, action: 'suspend' })
  if (!gate.ok) return NextResponse.json({ ok: false, code: (gate as any).code }, { status: (gate as any).status })
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ suspended_until: until.toISOString(), is_banned: false } as any)
    .eq('id', targetId)
  if (error) return NextResponse.json({ ok: false, error: 'db_error', detail: error.message }, { status: 500 })

  await logAdminAction({ actorId: auth.user!.id, targetUserId: targetId, action: 'suspend', reason: reason ?? null, payload: { until: until.toISOString() } })

  return NextResponse.json({ ok: true })
}


