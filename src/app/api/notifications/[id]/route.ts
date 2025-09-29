export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/server-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logInfo, logError } from '@/lib/logging'

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx?.params?.id
  if (!id) {
    return NextResponse.json({ error: '通知IDが必要です' }, { status: 400 })
  }

  const authErr = await requireAdminAuth()
  if (authErr) return authErr

  try {
    const supabase = createServiceRoleClient()
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: '無効な通知IDです' }, { status: 400 })
    }

    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', idNum)

    if (error) {
      logError('admin_notification_delete_failed', { id, error: String(error?.message || error) })
      return NextResponse.json({ error: '通知の削除に失敗しました' }, { status: 500 })
    }

    logInfo('admin_notification_deleted', { id })
    return new NextResponse(null, { status: 204 })
  } catch (e: unknown) {
    logError('admin_notification_delete_exception', { id, error: String(e) })
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


