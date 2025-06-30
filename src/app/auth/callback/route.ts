import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createRouteHandlerClient()
    
    try {
      // 認証コードを使ってセッションを確立
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('認証コールバックエラー:', error.message)
        // エラーページにリダイレクト
        return NextResponse.redirect(`${requestUrl.origin}/?error=auth_callback_error`)
      }
      
      console.log('認証コールバック成功:', data.user?.email)
      
      // 成功時は指定されたページまたはホームページにリダイレクト
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
      
    } catch (error) {
      console.error('予期しない認証エラー:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=unexpected_error`)
    }
  }

  // コードがない場合はホームページにリダイレクト
  return NextResponse.redirect(`${requestUrl.origin}/`)
} 