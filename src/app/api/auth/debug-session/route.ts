import { NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/ssrClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function GET() {
  const supabase = createSSRClient()
  const session = await supabase.auth.getSession()
  const user = await supabase.auth.getUser()

  return NextResponse.json({
    ok: true,
    sessionPresent: !!session.data.session,
    userPresent: !!user.data.user,
    user: user.data.user ? { id: user.data.user.id, email: user.data.user.email } : null,
  })
}


