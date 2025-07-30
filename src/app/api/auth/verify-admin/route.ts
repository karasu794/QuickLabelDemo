import { NextResponse } from 'next/server'
import { verifyAdminAccess } from '@/lib/auth/server-auth'

/**
 * 管理者権限の再検証API
 * AdminGuardコンポーネントから定期的に呼び出される
 */
export async function GET() {
  try {
    const authResult = await verifyAdminAccess()
    
    if (!authResult.success) {
      console.log('🚨 管理者権限再検証失敗:', authResult.error)
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          message: '管理者権限の再検証に失敗しました'
        },
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      )
    }

    console.log('✅ 管理者権限再検証成功:', {
      userId: authResult.user?.id,
      email: authResult.user?.email,
      role: authResult.profile?.role
    })

    return NextResponse.json({
      success: true,
      message: '管理者権限が確認されました',
      user: {
        id: authResult.user?.id,
        email: authResult.user?.email
      },
      role: authResult.profile?.role
    })

  } catch (error) {
    console.error('🚨 管理者権限再検証API例外:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Verification service error',
        message: '権限検証サービスでエラーが発生しました'
      },
      { status: 500 }
    )
  }
} 