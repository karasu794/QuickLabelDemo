import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Actions Guard: allowlist of protected API paths
const PROTECTED_PREFIXES = [
  '/api/dev/health',
  '/api/diagnostics/runtime-logs',
  '/api/run-e2e',
  '/api/runs',
]

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) Guard protected endpoints with ACTIONS_TOKEN
  if (isProtectedPath(pathname)) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    const valid = process.env.ACTIONS_TOKEN || ''
    if (!valid || token !== valid) {
      return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer',
        },
      })
    }
  }

  // 2) Preserve existing Supabase auth refresh behavior for other routes
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })
  await supabase.auth.getSession()
  return res
}

export const config = {
  // Run only on the API namespace to minimize overhead
  matcher: ['/api/:path*'],
}


