export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdminAuthRoute } from '@/lib/auth/route'

export async function GET() {
  const auth = await requireAdminAuthRoute()
  if (!auth.ok) {
    const status = 'status' in auth ? auth.status : 403
    const err = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN'
    return NextResponse.json({ error: err }, { status })
  }

  const { supabase } = auth
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('id')
    .eq('is_read', false)

  if (error) return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  const count = Array.isArray(data) ? data.length : 0
  return NextResponse.json({ count })
}


