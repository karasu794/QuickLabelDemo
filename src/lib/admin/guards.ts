import { createServiceRoleClient } from '@/lib/supabase/server'

export type AdminAction = 'ban' | 'suspend' | 'resume' | 'delete'
type Ok = { ok: true }
type Err = { ok: false; status: 403 | 409 | 422; code: string; message?: string }

export async function ensureAdminUserActionAllowed(opts: {
  supabaseSR: ReturnType<typeof createServiceRoleClient>
  actorId: string
  targetId: string
  action: AdminAction
}): Promise<Ok | Err> {
  const { supabaseSR: supa, actorId, targetId, action } = opts

  // 1) 自分自身操作の抑止
  if (actorId === targetId) {
    return { ok: false, status: 403, code: 'SELF_ACTION_FORBIDDEN' }
  }

  // 2) 対象の存在とアクティブ性（deleted_at is null）
  const { data: target, error: e1 } = await (supa as any)
    .from('profiles')
    .select('id, role, is_admin, deleted_at')
    .eq('id', targetId)
    .maybeSingle()
  if (e1) return { ok: false, status: 422, code: 'DB_ERROR', message: String(e1.message) }
  if (!target || target.deleted_at) {
    return { ok: false, status: 409, code: 'TARGET_NOT_ACTIVE' }
  }

  // 3) 最後の管理者保護（ban/suspend/delete のみ）
  if (action === 'ban' || action === 'suspend' || action === 'delete') {
    const isTargetAdmin = target.is_admin === true || String(target.role ?? '').trim().toLowerCase() === 'admin'
    if (isTargetAdmin) {
      const { count, error: e2 } = await (supa as any)
        .from('profiles')
        .select('id', { count: 'exact', head: true } as any)
        .is('deleted_at', null)
        .or('is_admin.eq.true,role.eq.admin')
      if (e2) return { ok: false, status: 422, code: 'DB_ERROR', message: String(e2.message) }
      const adminCnt = count ?? 0
      if (adminCnt <= 1) {
        return { ok: false, status: 409, code: 'LAST_ADMIN_PROTECTED' }
      }
    }
  }

  return { ok: true }
}


