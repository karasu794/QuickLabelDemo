import { NextRequest, NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'
import type { Database } from '@/types/supabase'
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'] & {
  read_at?: string | null
  updated_at?: string | null
}

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
  return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

// notifications.id は number（integer）

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, userId, orgId } = await requireOrg()
    const idStr = params.id
    const idNum = Number(idStr)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ code: 'QL-VALIDATION', message: 'invalid id' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const update: Partial<NotificationRow> & Pick<NotificationUpdate, 'read_at' | 'updated_at'> = {
      is_read: true,
      read_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(update)
      .eq('id', idNum)
      .eq('org_id', orgId)
      .eq('target_user_id', userId)
      .select('id,is_read,read_at,updated_at')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data }, { status: 200 })
  } catch (e: unknown) {
    if (isKnownError(e)) {
      return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
    }
    return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
  }
}


