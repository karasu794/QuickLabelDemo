import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API用管理者認証チェック（クッキーベース）
 */
export async function verifyAdminAccess() {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // 現在のユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('🚨 API認証失敗: ユーザー未認証')
      return {
        success: false,
        error: 'Unauthorized',
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
      console.warn('🚨 非管理者による管理者APIアクセス試行:', {
        userId: user.id,
        email: user.email,
        role: profile?.role,
        timestamp: new Date().toISOString()
      })
      
      return {
        success: false,
        error: 'Access denied: Admin role required',
        user,
        profile
      }
    }

    console.log('✅ 管理者API認証成功:', {
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
    console.error('🚨 管理者認証例外:', error)
    return {
      success: false,
      error: 'Authentication service error',
      user: null,
      profile: null
    }
  }
}

/**
 * 管理者認証ミドルウェア（APIルート用）
 * 認証に失敗した場合、適切なエラーレスポンスを返す
 */
export async function requireAdminAuth(): Promise<NextResponse | null> {
  const authResult = await verifyAdminAccess()
  
  if (!authResult.success) {
    const status = authResult.error === 'Unauthorized' ? 401 : 
                   authResult.error?.includes('Access denied') ? 403 : 500

    return NextResponse.json(
      {
        error: authResult.error,
        message: status === 401 ? 'ログインが必要です' : 
                 status === 403 ? '管理者権限が必要です' : 
                 '認証サービスエラーが発生しました'
      },
      { status }
    )
  }

  return null // 認証成功
}

/**
 * 管理者認証付きAPIハンドラー用のラッパー
 */
export function withAdminAuth<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const authError = await requireAdminAuth()
    if (authError) return authError
    
    return handler(...args)
  }
} 