// middleware.ts（プロジェクト直下）
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // ✅ ここが肝：helpersのmiddlewareクライアントでCookieを橋渡し
  const supabase = createMiddlewareClient<Database>({ req, res })

  // 毎リクエストでセッションCookieをリフレッシュ（必要なら Set-Cookie を付与）
  await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // ✅ API はセッション更新だけして即通す（リダイレクトやガードはしない）
  if (pathname.startsWith('/api')) {
    return res
  }

  // ---- ここから先はページ用の保護ロジック（従来どおり） ----
  const protectedRoutes = ['/mypage', '/shipping', '/history', '/admin']
  const { data: { user } } = await supabase.auth.getUser()

  // 認証済みなら login/signup へは行かせない
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 未認証で保護ページに来たらログインへ
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    const redirectTo = encodeURIComponent(pathname + req.nextUrl.search)
    return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, req.url))
  }

  return res
}

// ✅ `/api` を含む全リクエストに適用（静的だけ除外）
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
