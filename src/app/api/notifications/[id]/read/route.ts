export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'
import { requireAdminAuthRoute } from '@/lib/auth/route'
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

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminAuthRoute()
  if (!admin.ok) {
    const status = 'status' in admin ? admin.status : 403
    const err = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN'
    return NextResponse.json({ error: err }, { status })
  }
  try {
    const { supabase, userId, orgId } = await requireOrg()
    const idStr = params.id
    const idNum = Number(idStr)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'invalid id' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const update: Partial<NotificationRow> & Pick<NotificationUpdate, 'read_at' | 'updated_at'> = {
      is_read: true,
      read_at: now,
      updated_at: now,
    }

    const { data, error } = await (supabase
      .from('notifications') as any)
      .update(update as any)
      .eq('id', idNum)
      .eq('org_id', orgId as NotificationRow['org_id'])
      .eq('target_user_id', userId as NotificationRow['target_user_id'])
      .select('id,is_read,read_at,updated_at')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'INTERNAL', message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data }, { status: 200 })
  } catch (e: unknown) {
    if (isKnownError(e)) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'INTERNAL', message: '予期しないエラーが発生しました' }, { status: 500 })
  }
}


