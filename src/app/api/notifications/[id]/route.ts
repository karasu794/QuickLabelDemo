export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'
import { logInfo, logError } from '@/lib/logging'

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx?.params?.id
  if (!id) {
    return NextResponse.json({ error: '通知IDが必要です' }, { status: 400 })
  }

  const auth = await requireAdminAuthRoute()
  if (!auth.ok) {
    const status = 'status' in auth ? auth.status : 403
    const err = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN'
    return NextResponse.json({ error: err }, { status })
  }

  try {
    const { supabase } = auth
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


