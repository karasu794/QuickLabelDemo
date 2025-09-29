export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/server-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logInfo, logError } from '@/lib/logging'

export async function POST() {
  const authErr = await requireAdminAuth()
  if (authErr) return authErr

  try {
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()
    const { data, error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .is('read_at', null)
      .select('id')

    if (error) {
      logError('admin_notifications_mark_all_read_failed', { error: String(error?.message || error) })
      return NextResponse.json({ error: '一括既読に失敗しました' }, { status: 500 })
    }

    const updated = Array.isArray(data) ? data.length : 0
    logInfo('admin_notifications_mark_all_read', { updated })
    return NextResponse.json({ updated }, { status: 200 })
  } catch (e: unknown) {
    logError('admin_notifications_mark_all_read_exception', { error: String(e) })
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


