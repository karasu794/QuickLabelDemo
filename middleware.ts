import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // ★緊急デバッグ: middlewareが実行されていることを確認
  console.log(`[MIDDLEWARE] 🚨 EMERGENCY DEBUG - Middleware EXECUTED for: ${pathname}`)
  console.log(`[MIDDLEWARE] 🚨 Request URL: ${request.url}`)
  console.log(`[MIDDLEWARE] 🚨 Request headers:`, Object.fromEntries(request.headers.entries()))
  console.log(`[MIDDLEWARE] 🚨 Request cookies:`, request.cookies.getAll())

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // ★リクエストごとにサーバークライアントを生成するこの定型句が極めて重要
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = request.cookies.get(name)?.value
            console.log(`[MIDDLEWARE] 🍪 Cookie GET: ${name} = ${value}`)
            return value
          },
          set(name: string, value: string, options: CookieOptions) {
            console.log(`[MIDDLEWARE] 🍪 Cookie SET: ${name} = ${value}`)
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
            console.log(`[MIDDLEWARE] 🍪 Cookie REMOVE: ${name}`)
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

    console.log(`[MIDDLEWARE] 🔍 Supabase client created, getting user...`)
    
    // ★セッション情報をリフレッシュし、ユーザーを取得する
    const { data: { user }, error } = await supabase.auth.getUser()

    console.log(`[MIDDLEWARE] 🛂 Checkpoint: ${pathname}`, {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: error?.message
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

  } catch (error) {
    console.error(`[MIDDLEWARE] 🚨 CRITICAL ERROR:`, error)
    // エラー時は安全にアクセスを許可（認証チェックはページレベルで再実行）
    return response
  }
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