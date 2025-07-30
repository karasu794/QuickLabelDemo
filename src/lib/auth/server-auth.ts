import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 管理者権限の検証結果インターフェース
 */
interface AdminVerificationResult {
  success: boolean
  user?: any
  profile?: any
  error?: string
}

/**
 * サーバーサイドで管理者権限を検証
 * @returns AdminVerificationResult
 */
export async function verifyAdminAccess(): Promise<AdminVerificationResult> {
  try {
    const supabase = createClient()
    
    // ユーザー認証状態を確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('🚨 認証エラー:', userError?.message || 'ユーザーが見つかりません')
      return {
        success: false,
        error: 'Unauthorized'
      }
    }

    // ユーザーのプロフィール（ロール）を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('🚨 プロフィール取得エラー:', profileError.message)
      return {
        success: false,
        error: 'Profile fetch failed'
      }
    }

    if (profile?.role !== 'admin') {
      console.log('🚨 管理者権限なし:', { userId: user.id, role: profile?.role })
      return {
        success: false,
        error: 'Insufficient permissions'
      }
    }

    console.log('✅ 管理者権限確認:', { userId: user.id, email: user.email })
    return {
      success: true,
      user,
      profile
    }

  } catch (error) {
    console.error('🚨 管理者権限検証例外:', error)
    return {
      success: false,
      error: 'Verification service error'
    }
  }
}

/**
 * APIルートで管理者認証を要求し、エラー時にレスポンスを返す
 * @returns NextResponse | null (認証成功時はnull)
 */
export async function requireAdminAuth(): Promise<NextResponse | null> {
  const authResult = await verifyAdminAccess()
  
  if (!authResult.success) {
    console.log('🚨 管理者認証失敗:', authResult.error)
    
    const statusCode = authResult.error === 'Unauthorized' ? 401 : 403
    const message = authResult.error === 'Unauthorized' 
      ? 'ログインが必要です' 
      : '管理者権限が必要です'
    
    return NextResponse.json(
      {
        success: false,
        error: authResult.error,
        message
      },
      { status: statusCode }
    )
  }
  
  return null
} 