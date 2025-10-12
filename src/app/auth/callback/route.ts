import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/mypage'
  const type = requestUrl.searchParams.get('type') ?? undefined

  if (code) {
    const supabase = createRouteHandlerClient()
    
    try {
      // 認証コードを使ってセッションを確立
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(`${requestUrl.origin}/login?verify_error=1`)
      }
      
      // 成功時は指定されたページに verified=1 を付与してリダイレクト
      const redirectUrl = new URL(`${requestUrl.origin}${next}`)
      redirectUrl.searchParams.set('verified', '1')
      if (type) redirectUrl.searchParams.set('type', type)
      return NextResponse.redirect(redirectUrl.toString())
      
    } catch (error) {
      return NextResponse.redirect(`${requestUrl.origin}/login?verify_error=1`)
    }
  }

  // コードがない場合はホームページにリダイレクト
  return NextResponse.redirect(`${requestUrl.origin}/login?verify_error=1`)
} 