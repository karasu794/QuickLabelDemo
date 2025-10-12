import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })
  // 認証状態を読み出すことで、必要なら自動的にリフレッシュ＆Set-Cookie が行われる
  await supabase.auth.getSession()
  return res
}

export const config = {
  matcher: ['/:path*'],
}


