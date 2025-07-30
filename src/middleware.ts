import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
    // quicklabel-auth-token の値を確認
    const authTokenCookie = request.cookies.get('quicklabel-auth-token')
    
    // quicklabel-auth-token からセッション情報を直接取得を試行
    let user = null
    let session = null
    
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
          // 手動でセッション情報を構築
          user = cookieData.user
          session = cookieData
        }
      } catch (e) {
        console.log(`[MIDDLEWARE] Failed to parse cookie:`, e)
      }
    }
    
    // Supabase のセッションが取得できない場合の fallback
    if (!session || !user) {
      const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (supabaseSession && !sessionError) {
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser()
        if (!userError) {
          user = userData
          session = supabaseSession
        }
      }
    }
    
    // ユーザーが取得できない場合は未ログイン状態として処理
    const isLoggedIn = !!user

    // 1. ログイン済みユーザーがログイン・サインアップページにアクセスした場合のリダイレクト
    if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 2. 管理者ページへのアクセス制御
    if (pathname.startsWith('/admin')) {
      if (!isLoggedIn) {
        // 未ログインならログインページへ
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // SupabaseのDBからユーザーのロールを取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error in middleware:', profileError)
        return NextResponse.redirect(new URL('/', request.url))
      }

      if (profile?.role !== 'admin') {
        // 管理者でなければトップページへ
        return NextResponse.redirect(new URL('/', request.url))
      }
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