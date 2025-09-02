import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return NextResponse.json({ code: 'QL-AUTH', message: 'Unauthorized' }, { status: 401 })
  }
  const { user } = data
  return NextResponse.json({ id: user.id, email: user.email }, { status: 200 })
}


