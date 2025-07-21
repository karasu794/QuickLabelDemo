import { NextRequest, NextResponse } from 'next/server'
import { getFedExRates, type RateRequestInfo } from '@/lib/fedex/auth'

/**
 * MPS用即座料金見積もりAPI
 * 確認ページで複数パッケージの料金を即座に計算
 */

interface MPSQuoteRequest {
  shipperInfo: {
    countryCode: string
    postalCode: string
    stateCode?: string
    cityName: string
  }
  recipientInfo: {
    countryCode: string
    postalCode: string
    stateCode?: string
    cityName: string
    isResidential: boolean
  }
  packages: Array<{
    weight: number
    type: string
    length?: number
    width?: number
    height?: number
    declaredValue?: number
  }>
  shipDate: string
}

export async function POST(request: NextRequest) {
  try {
    const body: MPSQuoteRequest = await request.json()
    console.log('🚚 MPS料金見積もりリクエスト:', JSON.stringify(body, null, 2))

    const { shipperInfo, recipientInfo, packages, shipDate } = body

    // バリデーション
    if (!shipperInfo.countryCode || !recipientInfo.countryCode) {
      return NextResponse.json(
        { error: '出荷地と仕向地の国を選択してください' },
        { status: 400 }
      )
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json(
        { error: 'パッケージ情報が必要です' },
        { status: 400 }
      )
    }

    // 1個の場合は通常のRate APIを使用
    if (packages.length === 1) {
      const rateInfo: RateRequestInfo = {
        shipperCountryCode: shipperInfo.countryCode,
        shipperPostalCode: shipperInfo.postalCode,
        shipperStateCode: shipperInfo.stateCode,
        shipperCityName: shipperInfo.cityName,
        recipientCountryCode: recipientInfo.countryCode,
        recipientPostalCode: recipientInfo.postalCode,
        recipientStateCode: recipientInfo.stateCode,
        recipientCityName: recipientInfo.cityName,
        shipDate,
        isResidential: recipientInfo.isResidential,
        packages: packages.map(pkg => ({
          weight: pkg.weight,
          ...(pkg.length && pkg.width && pkg.height && {
            dimensions: {
              length: pkg.length,
              width: pkg.width,
              height: pkg.height
            }
          }),
          declaredValue: pkg.declaredValue
        }))
      }

      const rates = await getFedExRates(rateInfo)
      
      return NextResponse.json({
        success: true,
        type: 'standard',
        packageCount: 1,
        rates: rates.map(rate => ({
          serviceType: rate.serviceType,
          serviceName: rate.serviceName,
          amount: rate.amount,
          currency: rate.currency,
          deliveryDate: rate.deliveryDate,
          deliveryDayOfWeek: rate.deliveryDayOfWeek,
          isMPS: false
        }))
      })
    }

    // 2個以上の場合はMPS処理として料金を計算
    // 複数パッケージの場合の料金計算ロジック
    console.log(`📦 複数パッケージ(${packages.length}個)のMPS料金計算`)

    // 基本料金を計算（単価 × パッケージ数の概算）
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0)
    const averageWeight = totalWeight / packages.length

    // 代表的なパッケージで料金を取得し、パッケージ数に応じて調整
    const representativePackage = {
      weight: averageWeight,
      ...(packages[0].length && packages[0].width && packages[0].height && {
        dimensions: {
          length: packages[0].length,
          width: packages[0].width,
          height: packages[0].height
        }
      }),
      declaredValue: packages.reduce((sum, pkg) => sum + (pkg.declaredValue || 0), 0) / packages.length
    }

    const rateInfo: RateRequestInfo = {
      shipperCountryCode: shipperInfo.countryCode,
      shipperPostalCode: shipperInfo.postalCode,
      shipperStateCode: shipperInfo.stateCode,
      shipperCityName: shipperInfo.cityName,
      recipientCountryCode: recipientInfo.countryCode,
      recipientPostalCode: recipientInfo.postalCode,
      recipientStateCode: recipientInfo.stateCode,
      recipientCityName: recipientInfo.cityName,
      shipDate,
      isResidential: recipientInfo.isResidential,
      packages: [representativePackage]
    }

    const singleRates = await getFedExRates(rateInfo)

    // MPS用の料金調整（複数パッケージの割引効果を考慮）
    const mpsRates = singleRates.map(rate => {
      // 複数パッケージの場合の割引率（パッケージ数に応じて段階的）
      let discountRate = 1.0
      if (packages.length >= 2 && packages.length <= 5) {
        discountRate = 0.95 // 5%割引
      } else if (packages.length >= 6 && packages.length <= 10) {
        discountRate = 0.90 // 10%割引
      } else if (packages.length > 10) {
        discountRate = 0.85 // 15%割引
      }

      const adjustedAmount = Math.round(rate.amount * packages.length * discountRate)

      return {
        serviceType: rate.serviceType,
        serviceName: `${rate.serviceName} (MPS ${packages.length}個口)`,
        amount: adjustedAmount,
        currency: rate.currency,
        deliveryDate: rate.deliveryDate,
        deliveryDayOfWeek: rate.deliveryDayOfWeek,
        isMPS: true,
        packageCount: packages.length,
        discountRate: Math.round((1 - discountRate) * 100)
      }
    })

    console.log(`✅ MPS料金計算完了: ${mpsRates.length}件のサービス`)

    return NextResponse.json({
      success: true,
      type: 'mps',
      packageCount: packages.length,
      totalWeight,
      rates: mpsRates
    })

  } catch (error) {
    console.error('❌ MPS料金見積もりエラー:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'MPS料金見積もりに失敗しました',
        success: false
      },
      { status: 500 }
    )
  }
} 