'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

type AdminActionKind = 'ban' | 'suspend' | 'resume' | 'delete'

export async function logAdminAction(params: {
  actorId: string
  targetUserId: string
  action: AdminActionKind
  reason?: string | null
  payload?: Record<string, unknown> | null
}): Promise<void> {
  const supabase = createServiceRoleClient()
  await (supabase as any).from('admin_actions').insert({
    actor_id: params.actorId,
    target_user_id: params.targetUserId,
    action: params.action,
    reason: params.reason ?? null,
    payload: (params.payload as any) ?? null,
  } as any)
}


