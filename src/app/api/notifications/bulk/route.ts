export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'
import { logInfo, logError } from '@/lib/logging'

type BulkBody = { action: 'read' | 'unread' | 'delete'; ids: string[] }

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuthRoute()
  if (!auth.ok) {
    const status = 'status' in auth ? auth.status : 403
    const err = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN'
    return NextResponse.json({ error: err }, { status })
  }

  let body: BulkBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const { action, ids } = body || ({} as BulkBody)
  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'action と ids は必須です' }, { status: 400 })
  }

  const { supabase } = auth

  try {
    let updated = 0
    if (action === 'delete') {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .delete()
        .in('id', ids.map((v) => (Number.isFinite(Number(v)) ? Number(v) : v)))
        .select('id')
      if (error) throw error
      updated = Array.isArray(data) ? data.length : 0
    } else if (action === 'read') {
      const now = new Date().toISOString()
      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true, read_at: now })
        .in('id', ids.map((v) => (Number.isFinite(Number(v)) ? Number(v) : v)))
        .select('id')
      if (error) throw error
      updated = Array.isArray(data) ? data.length : 0
    } else if (action === 'unread') {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .in('id', ids.map((v) => (Number.isFinite(Number(v)) ? Number(v) : v)))
        .select('id')
      if (error) throw error
      updated = Array.isArray(data) ? data.length : 0
    } else {
      return NextResponse.json({ error: 'BAD_REQUEST', message: '不正な action' }, { status: 400 })
    }

    logInfo('admin_notifications_bulk', { action, count: ids.length })
    return NextResponse.json({ updated }, { status: 200 })
  } catch (e: unknown) {
    logError('admin_notifications_bulk_failed', { action, error: String(e) })
    return NextResponse.json({ error: 'INTERNAL', message: '一括操作に失敗しました' }, { status: 500 })
  }
}


