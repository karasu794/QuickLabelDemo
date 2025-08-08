import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ★リクエストごとにサーバークライアントを生成するこの定型句が極めて重要
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // リクエストとレスポンスのCookieを同期させる
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // リクエストとレスポンスのCookieを同期させる
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ★セッション情報をリフレッシュし、ユーザーを取得する
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  console.log(`[MIDDLEWARE] 🛂 Checkpoint: ${pathname}`, {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email
  })

  // 保護されたルートの定義
  const protectedRoutes = ['/mypage', '/shipping', '/history', '/admin']

  // ログイン済みユーザーがログイン・サインアップページにアクセスした場合のリダイレクト
  if (user && (pathname === '/login' || pathname === '/signup')) {
    console.log(`[MIDDLEWARE] 🔄 Redirecting authenticated user to home`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ユーザーが未認証で、保護されたルートにアクセスしようとした場合
  if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
    console.log(`[MIDDLEWARE] 🚫 Access denied to protected route: ${pathname}`)
    // ログインページにリダイレクト
    const redirectTo = encodeURIComponent(pathname)
    return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, request.url))
  }

  // 管理者ページの特別なアクセス制御
  if (pathname.startsWith('/admin') && user) {
    console.log(`[MIDDLEWARE] 👑 Admin page access check for user: ${user.id}`)
    
    // 管理者権限チェックはサーバーサイドで行う（middleware では基本認証のみ）
    // 実際の権限チェックは各admin pageのgetServerSidePropsまたはServer Componentで実行
    console.log(`[MIDDLEWARE] ✅ Passing admin request to page for detailed authorization`)
  }

  console.log(`[MIDDLEWARE] ✅ Access granted: ${pathname}`)
  // ユーザーが認証済みの場合、あるいは公開ページへのアクセスの場合
  return response
}

// ミドルウェアが実行されるパスの指定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}