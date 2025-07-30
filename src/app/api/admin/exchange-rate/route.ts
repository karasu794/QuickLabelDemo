import { NextRequest, NextResponse } from 'next/server'
import { ExchangeRateService } from '@/lib/services/exchangeRateService'
import { requireAdminAuth } from '@/lib/auth/server-auth'

// 為替レート履歴を取得
export async function GET(request: NextRequest) {
  try {
    // 管理者認証チェック
    const authError = await requireAdminAuth()
    if (authError) return authError

    console.log('🔐 管理者為替レート履歴取得開始')

    // URLパラメータから取得件数を取得（デフォルト: 20件）
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    // 為替レート履歴を取得
    const history = await ExchangeRateService.getExchangeRateHistory(limit)

    // 現在の為替レートも取得
    const currentRate = await ExchangeRateService.getExchangeRate()

    console.log(`📊 為替レート履歴取得完了: ${history.length}件`)

    return NextResponse.json({
      success: true,
      currentRate,
      history,
      total: history.length
    })

  } catch (error) {
    console.error('❌ 管理者為替レート履歴取得エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 為替レート強制更新
export async function POST(request: NextRequest) {
  try {
    // 管理者認証チェック
    const authError = await requireAdminAuth()
    if (authError) return authError

    console.log('🔐 管理者為替レート強制更新開始')

    // 為替レートを強制更新
    const newRate = await ExchangeRateService.forceUpdateExchangeRate()

    console.log(`✅ 管理者為替レート強制更新完了: ${newRate}`)

    return NextResponse.json({
      success: true,
      rate: newRate,
      message: '為替レートを最新情報に更新しました',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 管理者為替レート強制更新エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 