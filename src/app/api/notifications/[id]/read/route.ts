import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrg } from '@/lib/org'
import type { Database } from '@/types/supabase'
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
  return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

// notifications.id は number（integer）
const idSchema = z.object({ id: z.string().regex(/^\d+$/, 'invalid id') })

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = idSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ code: 'QL-VALIDATION', message: '無効なIDです' }, { status: 400 })
    }

    const { supabase, userId } = await requireOrg()
    const id = parsed.data.id
    const idNum = Number(id)

    const updates: NotificationUpdate = {
      is_read: true,
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', idNum)
      .eq('target_user_id', userId)
      .select('id,created_at,created_by,is_read,message,org_id,target_user_id,type')
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


