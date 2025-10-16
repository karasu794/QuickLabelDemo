import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveSafeNext } from '@/lib/auth/redirect'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const rawNext = requestUrl.searchParams.get('next')
  const safeNext = resolveSafeNext(rawNext, '/mypage')
  const type = requestUrl.searchParams.get('type') ?? undefined

  if (code) {
    const supabase = createRouteHandlerClient()
    
    try {
      // 認証コードを使ってセッションを確立
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(`${requestUrl.origin}/login?verify_error=1`)
      }
      
      // 成功時は確認完了ページに遷移（next と type を引き継ぎ）
      const verifiedUrl = new URL(`${requestUrl.origin}/auth/verified`)
      verifiedUrl.searchParams.set('verified', '1')
      if (type) verifiedUrl.searchParams.set('type', type)
      if (safeNext) verifiedUrl.searchParams.set('next', safeNext)
      return NextResponse.redirect(verifiedUrl.toString())
      
    } catch (error) {
      return NextResponse.redirect(`${requestUrl.origin}/login?verify_error=1`)
    }
  }

  // コードがない場合はホームページにリダイレクト
  return NextResponse.redirect(`${requestUrl.origin}/login?verify_error=1`)
} 