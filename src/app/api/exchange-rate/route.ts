import { NextRequest, NextResponse } from 'next/server'
import { ExchangeRateService } from '@/lib/services/exchangeRateService'

export async function GET(request: NextRequest) {
  try {
    const rate = await ExchangeRateService.getExchangeRate()
    
    return NextResponse.json({ 
      success: true,
      rate,
      source: 'database_with_api_fallback',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ 為替レート取得エラー:', error)
    
    return NextResponse.json({
      success: false,
      rate: 150.0, // エラー時のフォールバック
      source: 'fallback',
      error: error instanceof Error ? error.message : '不明なエラー',
      timestamp: new Date().toISOString()
    }, { status: 200 }) // エラーでも200で返す（フォールバック）
  }
} 