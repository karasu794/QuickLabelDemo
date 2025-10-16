import { createServiceRoleClient } from '@/lib/supabase/server'

type Level = 'info' | 'success' | 'error'

export async function createAdminNotification(params: {
  title?: string
  message: string
  level: Level
  actor_id?: string | null
  target_user_id?: string | null
}) {
  const supabase = createServiceRoleClient()
  const type = params.level // NotificationClient 側で色分け（success/error/info）
  await supabase.from('notifications').insert({
    type,
    message: params.title ? `${params.title}\n${params.message}` : params.message,
    is_read: false,
    created_by: params.actor_id ?? null,
    target_user_id: params.target_user_id ?? null,
  } as any)
}


