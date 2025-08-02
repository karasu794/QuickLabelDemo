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
        console.log(`[ADMIN MIDDLEWARE] Failed to parse cookie:`, e)
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

    // ログイン・MFA関連ページは認証チェックをスキップ
    if (pathname === '/login' || pathname.startsWith('/mfa-')) {
      return response
    }

    // 未ログインの場合はログインページへリダイレクト
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // SupabaseのDBからユーザーのロールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profileError) {
      console.error('[ADMIN MIDDLEWARE] Profile fetch error:', profileError)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 管理者権限チェック（管理者でなければアクセス拒否）
    if (profile?.role !== 'admin') {
      console.warn(`[ADMIN MIDDLEWARE] Non-admin user attempted access: ${user!.email}`)
      // 管理者でない場合は、メインアプリのログインページへリダイレクト
      return NextResponse.redirect(new URL('https://quicklabel.jp/login', request.url))
    }

    // 管理者の場合はアクセスを許可
    return response

  } catch (error) {
    console.error('[ADMIN MIDDLEWARE] Unexpected error:', error)
    // エラーが発生した場合は安全にログインページへリダイレクト
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * 全てのパスに適用（ただし以下を除く）:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}