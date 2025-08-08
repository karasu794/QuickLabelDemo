import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ★リクエストごとにサーバークライアントを生成（推奨方法）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // リクエストCookieを更新
          request.cookies.set({ name, value, ...options })
          // レスポンスを新しく生成
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // レスポンスCookieを更新
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // リクエストCookieを削除
          request.cookies.set({ name, value: '', ...options })
          // レスポンスを新しく生成
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // レスポンスCookieを削除
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  try {
    console.log(`[MIDDLEWARE] 🛂 Border checkpoint started for path: ${pathname}`)
    
    // ★新しいクライアントでユーザー情報を取得（推奨方法）
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error(`[MIDDLEWARE] ❌ Auth error:`, error)
    }
    
    console.log(`[MIDDLEWARE] 🔍 User authentication status:`, {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email
    })
    
    // ログイン済みユーザーがログイン・サインアップページにアクセスした場合のリダイレクト
    if (user && (pathname === '/login' || pathname === '/signup')) {
      console.log(`[MIDDLEWARE] 🔄 Logged-in user accessing auth page, redirecting to home`)
      return NextResponse.redirect(new URL('/', request.url))
    }
    // 保護されたページへのアクセス制御
    if (isProtectedPath(pathname) && !user) {
      console.log(`[MIDDLEWARE] 🚫 Protected path access denied: ${pathname}`)
      const redirectTo = encodeURIComponent(pathname)
      return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, request.url))
    }

    // 管理者ページへのアクセス制御
    if (pathname.startsWith('/admin')) {
      console.log(`[MIDDLEWARE] 👑 Admin access attempt:`, {
        pathname,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email
      })

      if (!user || !user.id) {
        console.log(`[MIDDLEWARE] 🚫 Admin access denied: Not logged in`)
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Service Role Keyを使った管理者権限チェック
      console.log(`[MIDDLEWARE] 🔍 Checking admin role for userId: ${user.id}`)
      
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        console.error(`[MIDDLEWARE] ❌ Service Role Key not found`)
        return NextResponse.redirect(new URL('/login?error=service_key_missing', request.url))
      }
      
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || profile?.role !== 'admin') {
        console.log(`[MIDDLEWARE] 🚫 Admin access denied:`, {
          error: profileError?.message,
          role: profile?.role
        })
        return NextResponse.redirect(new URL('/', request.url))
      }

      console.log(`[MIDDLEWARE] ✅ Admin access granted`)
    }

    console.log(`[MIDDLEWARE] ✅ Access granted for: ${pathname}`)
    return response

  } catch (error) {
    console.error('[MIDDLEWARE] ❌ Unexpected error:', error)
    // エラーが発生した場合、保護されたパスなら安全にログインページへリダイレクト
    if (isProtectedPath(pathname)) {
      const redirectTo = encodeURIComponent(pathname)
      return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, request.url))
    }
    return response
  }
}

// 保護されたパスかどうかを判定するヘルパー関数
function isProtectedPath(pathname: string): boolean {
  const protectedPaths = ['/mypage', '/shipping', '/history', '/admin']
  return protectedPaths.some(path => pathname.startsWith(path))
}

export const config = {
  matcher: [
    /*
     * Match specific protected paths and auth pages:
     * - /admin (admin pages)
     * - /mypage (user profile pages)
     * - /shipping (shipping pages)
     * - /history (history pages)
     * - /login (redirect logged-in users)
     * - /signup (redirect logged-in users)
     */
    '/admin/:path*',
    '/mypage/:path*',
    '/shipping/:path*',
    '/history/:path*',
    '/login',
    '/signup'
  ],
}