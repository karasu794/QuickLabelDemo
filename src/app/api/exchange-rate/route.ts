import { NextRequest, NextResponse } from 'next/server'

// キャッシュ用の型定義
interface CachedRate {
  rate: number
  timestamp: number
}

// メモリキャッシュ（1時間）
let cachedExchangeRate: CachedRate | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1時間（ミリ秒）

export async function GET(request: NextRequest) {
  try {
    console.log('💱 為替レート取得リクエスト開始')

    // キャッシュチェック
    const now = Date.now()
    if (cachedExchangeRate && (now - cachedExchangeRate.timestamp) < CACHE_DURATION) {
      console.log('📦 キャッシュから為替レート返却:', cachedExchangeRate.rate)
      return NextResponse.json({ 
        rate: cachedExchangeRate.rate,
        source: 'cache',
        timestamp: cachedExchangeRate.timestamp
      })
    }

    // 環境変数チェック
    const apiKey = process.env.EXCHANGERATE_API_KEY
    if (!apiKey) {
      console.error('❌ EXCHANGERATE_API_KEY環境変数が設定されていません')
      // フォールバック用の固定レート
      const fallbackRate = 150.0
      return NextResponse.json({ 
        rate: fallbackRate,
        source: 'fallback',
        message: 'API Key not configured, using fallback rate'
      })
    }

    console.log('🌐 ExchangeRate-APIを呼び出し中...')
    
    // ExchangeRate-API呼び出し
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // 10秒タイムアウト
        signal: AbortSignal.timeout(10000)
      }
    )

    if (!response.ok) {
      throw new Error(`ExchangeRate-API エラー: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ ExchangeRate-API レスポンス受信')

    // レスポンス構造チェック
    if (!data.conversion_rates || !data.conversion_rates.JPY) {
      throw new Error('ExchangeRate-API レスポンスにJPYレートが含まれていません')
    }

    const usdToJpyRate = data.conversion_rates.JPY
    console.log(`💱 USD→JPYレート: ${usdToJpyRate}`)

    // キャッシュに保存
    cachedExchangeRate = {
      rate: usdToJpyRate,
      timestamp: now
    }

    return NextResponse.json({
      rate: usdToJpyRate,
      source: 'api',
      timestamp: now,
      lastUpdate: data.time_last_update_unix
    })

  } catch (error) {
    console.error('❌ 為替レート取得エラー:', error)

    // エラー時のフォールバック
    const fallbackRate = 150.0
    console.log(`🔄 フォールバックレートを使用: ${fallbackRate}`)

    return NextResponse.json({
      rate: fallbackRate,
      source: 'fallback',
      error: error instanceof Error ? error.message : '不明なエラー',
      timestamp: Date.now()
    }, { status: 200 }) // エラーでも200で返す（フォールバック）
  }
} 