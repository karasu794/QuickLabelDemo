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
  // x-request-id の強制貫通（受信→次のハンドラ/レスポンスへ）
  const rid = req.headers.get('x-request-id') || req.headers.get('X-Request-Id') || `rid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-request-id', rid)

  // 1) Guard protected endpoints with ACTIONS_TOKEN (E2Eではバイパス)
  if (isProtectedPath(pathname) && (process.env.E2E_TEST_MODE || '') !== '1') {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    const valid = process.env.ACTIONS_TOKEN || ''
    if (!valid || token !== valid) {
      const unauthorized = new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer',
        },
      })
      unauthorized.headers.set('x-request-id', rid)
      return unauthorized
    }
  }

  // 2) E2E: NEXT_PUBLIC_TEST_FORCE_ANCHORS=1 の場合、レビュー画面へ forceShow=1 を付与
  try {
    const force = (process.env.NEXT_PUBLIC_TEST_FORCE_ANCHORS || '') === '1'
    if (force && (pathname === '/shipping/new/review')) {
      const url = req.nextUrl.clone()
      if (url.searchParams.get('forceShow') !== '1') {
        url.searchParams.set('forceShow', '1')
        const redirect = NextResponse.redirect(url)
        redirect.headers.set('x-request-id', rid)
        return redirect
      }
    }
  } catch {}

  // 3) Preserve existing Supabase auth refresh behavior for other routes
  //    In demo mode, skip Supabase session refresh entirely
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('x-request-id', rid)

  const isDemo = (process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV) === 'demo'
  if (!isDemo) {
    const supabase = createMiddlewareClient<Database>({ req, res })
    await supabase.auth.getSession()
  }
  return res
}

export const config = {
  // API と レビュー画面で実行
  matcher: ['/api/:path*', '/shipping/new/review'],
}


