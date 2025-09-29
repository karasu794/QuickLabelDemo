export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/server-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logInfo, logError } from '@/lib/logging'

type BulkBody = { action: 'read' | 'unread' | 'delete'; ids: string[] }

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth()
  if (authErr) return authErr

  let body: BulkBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, ids } = body || ({} as BulkBody)
  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'action と ids は必須です' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

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
      return NextResponse.json({ error: '不正な action' }, { status: 400 })
    }

    logInfo('admin_notifications_bulk', { action, count: ids.length })
    return NextResponse.json({ updated }, { status: 200 })
  } catch (e: unknown) {
    logError('admin_notifications_bulk_failed', { action, error: String(e) })
    return NextResponse.json({ error: '一括操作に失敗しました' }, { status: 500 })
  }
}


