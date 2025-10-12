import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  return await updateSession(req, res)
}

export const config = {
  matcher: ['/:path*'],
}


