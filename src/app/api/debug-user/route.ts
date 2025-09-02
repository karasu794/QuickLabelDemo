import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    return NextResponse.json({ code: 'QL-AUTH', message: error.message }, { status: 401 })
  }
  if (!user) {
    return NextResponse.json({ code: 'QL-AUTH', message: 'ログインが必要です' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, userId: user.id, email: user.email }, { status: 200 })
}


