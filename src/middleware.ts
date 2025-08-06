import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Update request cookies
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Update response cookies
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Update request cookies
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          // Update response cookies
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  try {
    console.log(`[MIDDLEWARE] Session acquisition started for path: ${pathname}`)
    
    // まずSupabaseからのセッション取得を試行（より信頼性が高い）
    const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
    
    let user = null
    let session = null
    
    if (supabaseSession && !sessionError) {
      console.log(`[MIDDLEWARE] Supabase session found`, {
        hasSession: !!supabaseSession,
        hasUser: !!supabaseSession.user,
        userId: supabaseSession.user?.id,
        email: supabaseSession.user?.email
      })
      
      user = supabaseSession.user
      session = supabaseSession
    } else {
      console.log(`[MIDDLEWARE] Supabase session not found, trying cookie fallback`, {
        sessionError: sessionError?.message
      })
      
      // Supabaseセッションが取得できない場合のcookie fallback
      const authTokenCookie = request.cookies.get('quicklabel-auth-token')
      
      if (authTokenCookie?.value) {
        try {
          let cookieData
          
          // Base64 エンコードされているかチェック
          if (authTokenCookie.value.startsWith('base64-')) {
            // Base64 デコード
            const base64Data = authTokenCookie.value.replace('base64-', '')
            const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8')
            cookieData = JSON.parse(decodedData)
          } else {
            // 通常の JSON
            cookieData = JSON.parse(authTokenCookie.value)
          }
          
          if (cookieData.access_token && cookieData.user) {
            console.log(`[MIDDLEWARE] Cookie session parsed successfully`, {
              hasUser: !!cookieData.user,
              userId: cookieData.user?.id,
              email: cookieData.user?.email
            })
            // 手動でセッション情報を構築
            user = cookieData.user
            session = cookieData
          }
        } catch (e) {
          console.error(`[MIDDLEWARE] Failed to parse cookie:`, e)
        }
      }
    }
    
    // ユーザーが取得できない場合は未ログイン状態として処理
    const isLoggedIn = !!user
    
    console.log(`[MIDDLEWARE] Final authentication state:`, {
      isLoggedIn,
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      email: user?.email
    })

    // 1. ログイン済みユーザーがログイン・サインアップページにアクセスした場合のリダイレクト
    if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 2. 管理者ページへのアクセス制御
    if (pathname.startsWith('/admin')) {
      console.log(`[MIDDLEWARE] Admin access attempt:`, {
        pathname,
        isLoggedIn,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email
      })

      if (!isLoggedIn) {
        console.log(`[MIDDLEWARE] Admin access denied: Not logged in`)
        // 未ログインならログインページへ
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Type Safety: userがnullでないことを確認
      if (!user || !user.id) {
        console.error(`[MIDDLEWARE] Admin access denied: Invalid user object`, { user })
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // SupabaseのDBからユーザーのロールを取得（Service Role Keyを使用）
      console.log(`[MIDDLEWARE] Fetching user profile for userId: ${user.id}`)
      
      // Service Role Keyクライアントを作成（RLSバイパス）
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        console.error(`[MIDDLEWARE] Service Role Key not found`)
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

      console.log(`[MIDDLEWARE] Profile fetch result:`, {
        profile,
        profileError: profileError?.message,
        hasProfile: !!profile,
        role: profile?.role
      })

      if (profileError) {
        console.error(`[MIDDLEWARE] Profile fetch error with Service Role Key:`, {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userId: user.id,
          usingServiceRole: true
        })
        // Service Role Keyでも失敗した場合、システムエラーとして扱う
        return NextResponse.redirect(new URL('/login?error=system_error', request.url))
      }

      if (profile?.role !== 'admin') {
        console.log(`[MIDDLEWARE] Admin access denied: User role is not admin`, {
          userId: user.id,
          userEmail: user.email,
          currentRole: profile?.role
        })
        // 管理者でなければトップページへリダイレクト
        return NextResponse.redirect(new URL('/', request.url))
      }

      console.log(`[MIDDLEWARE] Admin access granted for user: ${user.id}`)
    }

    // 3. 一般保護ページへのアクセス制御
    if (isProtectedPath(pathname) && !isLoggedIn) {
      // 未ログインならリダイレクト先をクエリに含めてログインページへ
      const redirectTo = encodeURIComponent(pathname)
      return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, request.url))
    }

    // 4. 上記のいずれにも該当しない場合はアクセスを許可
    return response

  } catch (error) {
    console.error('Unexpected error in middleware:', error)
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
    // 保護が必要なパスのみに限定してパフォーマンスを向上
    '/admin/:path*',
    '/mypage/:path*', 
    '/shipping/:path*',
    '/history/:path*',
    '/login',
    '/signup'
  ],
}