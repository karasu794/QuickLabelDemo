import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// サーバーサイドでのSupabaseクライアント
const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // サービスロールキー使用
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * サーバーサイドでの管理者認証チェック
 * @param request NextRequest オブジェクト
 * @returns 認証結果と管理者情報
 */
export async function verifyAdminAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
        user: null,
        profile: null
      }
    }

    const token = authHeader.split(' ')[1]
    const supabase = createServerClient()

    // JWTトークンを検証
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('🚨 サーバーサイド認証失敗:', userError)
      return {
        success: false,
        error: 'Invalid token or user not found',
        user: null,
        profile: null
      }
    }

    // プロフィール情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('🚨 プロフィール取得エラー:', profileError)
      return {
        success: false,
        error: 'Profile not found',
        user,
        profile: null
      }
    }

    // 管理者権限チェック
    if (profile?.role !== 'admin') {
      console.warn('🚨 非管理者によるAPIアクセス試行:', {
        userId: user.id,
        email: user.email,
        role: profile?.role,
        timestamp: new Date().toISOString(),
        endpoint: request.url
      })
      
      return {
        success: false,
        error: 'Access denied: Admin role required',
        user,
        profile
      }
    }

    console.log('✅ サーバーサイド管理者認証成功:', {
      userId: user.id,
      email: user.email,
      role: profile.role
    })

    return {
      success: true,
      error: null,
      user,
      profile
    }

  } catch (error) {
    console.error('🚨 サーバーサイド認証例外:', error)
    return {
      success: false,
      error: 'Authentication service error',
      user: null,
      profile: null
    }
  }
}

/**
 * APIルートでの簡単な管理者認証チェック
 * @param request NextRequest オブジェクト
 * @returns 認証が成功した場合はnull、失敗した場合はErrorレスポンス
 */
export async function requireAdminAuth(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  
  if (!authResult.success) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        message: 'Admin authentication required'
      }),
      {
        status: authResult.error?.includes('Access denied') ? 403 : 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }

  return null // 認証成功
}

/**
 * クッキーベースの認証チェック（従来の認証との互換性）
 */
export async function verifyAdminAuthFromCookies() {
  try {
    // TODO: クッキーからのセッション検証実装
    // 現在はヘッダーベースの認証のみ実装
    console.warn('⚠️ クッキーベース認証は未実装')
    return {
      success: false,
      error: 'Cookie-based auth not implemented',
      user: null,
      profile: null
    }
  } catch (error) {
    console.error('🚨 クッキーベース認証エラー:', error)
    return {
      success: false,
      error: 'Cookie authentication error',
      user: null,
      profile: null
    }
  }
} 