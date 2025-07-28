import { NextRequest, NextResponse } from 'next/server'
import { ExchangeRateService } from '@/lib/services/exchangeRateService'

// 梱包材ごとの保険上限額（USD）
const PACKAGING_LIMITS_USD = {
  'FEDEX_ENVELOPE': 100,
  'FEDEX_PAK': 100,
  'FEDEX_BOX': 50000,
  'FEDEX_SMALL_BOX': 50000,
  'FEDEX_MEDIUM_BOX': 50000,
  'FEDEX_LARGE_BOX': 50000,
  'FEDEX_TUBE': 50000,
  'YOUR_PACKAGING': 50000,
  'customer': 50000 // カスタム梱包材
} as const



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { packages } = body

    // 入力値検証
    if (!packages || !Array.isArray(packages)) {
      return NextResponse.json(
        { error: 'packagesが必要です' },
        { status: 400 }
      )
    }

    console.log(`🔍 保険金額検証開始: ${packages.length}個のパッケージ`)

    // 為替レートを取得
    const usdToJpyRate = await ExchangeRateService.getExchangeRate()
    
    // 各パッケージの検証結果
    const packageValidations = packages.map((pkg: any) => {
      const { id, packagingType, declaredValue } = pkg

      // パッケージの基本検証
      if (!packagingType || typeof packagingType !== 'string') {
        return {
          packageId: id,
          isOverLimit: false,
          limitYen: 0,
          errorMessage: null
        }
      }

      const insuredValueNum = Number(declaredValue || 0)
      if (isNaN(insuredValueNum) || insuredValueNum <= 0) {
        return {
          packageId: id,
          isOverLimit: false,
          limitYen: 0,
          errorMessage: null
        }
      }

      // 梱包材の上限額を取得
      const limitUSD = PACKAGING_LIMITS_USD[packagingType as keyof typeof PACKAGING_LIMITS_USD]
      if (!limitUSD) {
        return {
          packageId: id,
          isOverLimit: false,
          limitYen: 0,
          errorMessage: `未知の梱包材タイプ: ${packagingType}`
        }
      }

      // USD上限額を円に換算
      const limitYen = Math.floor(limitUSD * usdToJpyRate)
      
      // 上限チェック
      const isOverLimit = insuredValueNum > limitYen
      
             // 梱包材名を日本語に変換
       const getPackagingDisplayName = (type: string): string => {
         const packagingNames: { [key: string]: string } = {
           'FEDEX_ENVELOPE': 'FedEx エンベロープ',
           'FEDEX_PAK': 'FedEx パック',
           'FEDEX_BOX': 'FedEx ボックス',
           'FEDEX_SMALL_BOX': 'FedEx スモールボックス',
           'FEDEX_MEDIUM_BOX': 'FedEx ミディアムボックス',
           'FEDEX_LARGE_BOX': 'FedEx ラージボックス',
           'FEDEX_TUBE': 'FedEx チューブ',
           'YOUR_PACKAGING': 'お客様ご用意の梱包材',
           'customer': 'お客様ご用意の梱包材'
         }
         return packagingNames[type] || type
       }

      console.log(`📦 パッケージ${id}: ${packagingType}, ¥${insuredValueNum.toLocaleString()}, 上限: ¥${limitYen.toLocaleString()}, 超過: ${isOverLimit}`)

      return {
        packageId: id,
        isOverLimit,
        limitYen,
        limitUSD,
        packagingType,
        packagingDisplayName: getPackagingDisplayName(packagingType),
        insuredValue: insuredValueNum,
        errorMessage: isOverLimit ? 
          `${getPackagingDisplayName(packagingType)}では¥${limitYen.toLocaleString()}まで` : 
          null
      }
    })

    // 全体の検証結果
    const hasAnyOverLimit = packageValidations.some(v => v.isOverLimit)

    return NextResponse.json({
      hasAnyOverLimit,
      exchangeRate: usdToJpyRate,
      packageValidations
    })

  } catch (error) {
    console.error('❌ 保険金額検証APIエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 