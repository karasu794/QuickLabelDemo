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
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 認証が必要なページ（マイページと発送関連）
  const protectedPaths = ['/mypage', '/shipping']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // 認証が必要なページで未ログインの場合、redirect_toパラメータ付きでログインページにリダイレクト
  if (isProtectedPath && !user) {
    const redirectTo = encodeURIComponent(request.nextUrl.pathname)
    return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, request.url))
  }

  // /admin配下のページへのアクセスをチェック
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const redirectTo = encodeURIComponent(request.nextUrl.pathname)
      return NextResponse.redirect(new URL(`/login?redirect_to=${redirectTo}`, request.url))
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/mypage/:path*', '/shipping/:path*'],
}