export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'
import { logInfo, logError } from '@/lib/logging'

export async function POST() {
  const auth = await requireAdminAuthRoute()
  if (!auth.ok) {
    const status = 'status' in auth ? auth.status : 403
    const err = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN'
    return NextResponse.json({ error: err }, { status })
  }

  try {
    const { supabase } = auth
    const now = new Date().toISOString()
    const { data, error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .is('read_at', null)
      .select('id')

    if (error) {
      logError('admin_notifications_mark_all_read_failed', { error: String(error?.message || error) })
      return NextResponse.json({ error: 'INTERNAL', message: '一括既読に失敗しました' }, { status: 500 })
    }

    const updated = Array.isArray(data) ? data.length : 0
    logInfo('admin_notifications_mark_all_read', { updated })
    return NextResponse.json({ updated }, { status: 200 })
  } catch (e: unknown) {
    logError('admin_notifications_mark_all_read_exception', { error: String(e) })
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


