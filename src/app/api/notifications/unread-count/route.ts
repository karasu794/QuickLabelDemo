import { NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'
import type { Database } from '@/types/supabase'

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
  return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

export async function GET() {
  try {
    const { supabase, userId, orgId } = await requireOrg()

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('target_user_id', userId)
      .eq('is_read', false)

    if (error) {
      return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: count ?? 0 }, { status: 200 })
  } catch (e: unknown) {
    if (isKnownError(e)) {
      return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
    }
    return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
  }
}


