import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 統合送り状作成API
 * パッケージ数に応じて自動的に通常処理またはMPS処理を選択
 */

interface UnifiedShippingRequest {
  sourceId: string // Square決済トークン
  finalCharge: number
  shipperInfo: any
  recipientInfo: any
  packages: any[]
  items: any[]
  contents: any
  shippingPurpose?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 統合送り状作成処理開始')
    
    const body: UnifiedShippingRequest = await request.json()
    const { sourceId, finalCharge, shipperInfo, recipientInfo, packages, items, contents, shippingPurpose } = body

    // パッケージ数による処理判定
    const packageCount = packages.length
    console.log(`📦 パッケージ数: ${packageCount}個`)

    if (packageCount === 1) {
      console.log('➡️ 通常の送り状作成処理を実行');
      
      // 通常の /api/ship に転送 (ヘッダー情報を引き継ぐ)
      const shipResponse = await fetch(`${request.nextUrl.origin}/api/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // オリジナルのリクエストからCookieを転送
          'Cookie': request.headers.get('Cookie') || '',
        },
        body: JSON.stringify(body),
      });

      const responseBody = await shipResponse.text();
      
      if (!shipResponse.ok) {
        try {
          const shipResult = JSON.parse(responseBody);
          throw new Error(shipResult.error || '通常送り状作成に失敗しました');
        } catch (e) {
          throw new Error(`通常送り状作成で予期せぬエラーが発生しました: ${responseBody}`);
        }
      }

      const shipResult = JSON.parse(responseBody);

      return NextResponse.json({
        success: true,
        type: 'standard',
        packageCount: 1,
        ...shipResult
      })

    } else {
      console.log(`➡️ MPS送り状作成処理を実行 (${packageCount}個口)`)
      
      try {
        // MPS処理：Open Ship APIを使用
        const mpsResult = await processMPSShipment({
          sourceId,
          finalCharge,
          shipperInfo,
          recipientInfo,
          packages,
          items,
          contents,
          shippingPurpose
        })

        return NextResponse.json({
          success: true,
          type: 'mps',
          packageCount,
          ...mpsResult
        })

      } catch (mpsError) {
        console.error('❌ MPS処理失敗:', mpsError)
        console.log('🔄 通常配送APIにフォールバック中...')

        // MPS失敗時のフォールバック：通常APIを試行（最初のパッケージのみ）
        try {
          const fallbackData = {
            ...body,
            packages: [packages[0]] // 最初のパッケージのみ使用
          }

          const fallbackResponse = await fetch(`${request.nextUrl.origin}/api/ship`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fallbackData),
          })

          const fallbackResult = await fallbackResponse.json()
          
          if (!fallbackResponse.ok) {
            throw new Error(fallbackResult.error || 'フォールバック処理に失敗しました')
          }

          console.log('✅ 通常APIフォールバック成功')

          return NextResponse.json({
            success: true,
            type: 'standard-fallback',
            packageCount: 1,
            originalPackageCount: packageCount,
            fallbackReason: 'MPS処理失敗のため通常処理にフォールバック',
            ...fallbackResult
          })

        } catch (fallbackError) {
          console.error('❌ フォールバック処理も失敗:', fallbackError)
          throw new Error(`MPS処理およびフォールバック処理に失敗しました: ${mpsError instanceof Error ? mpsError.message : mpsError}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ 統合送り状作成エラー:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '送り状作成に失敗しました',
        success: false
      },
      { status: 500 }
    )
  }
}

/**
 * MPS送り状作成処理
 */
async function processMPSShipment(data: {
  sourceId: string
  finalCharge: number
  shipperInfo: any
  recipientInfo: any
  packages: any[]
  items: any[]
  contents: any
  shippingPurpose?: string
}): Promise<any> {
  console.log('🚚 MPS送り状作成開始')

  const { sourceId, finalCharge, shipperInfo, recipientInfo, packages, items } = data

  try {
    // Step 1: Square決済処理
    console.log('💳 Square決済処理中...')
    const paymentResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceId,
        amount: finalCharge
      }),
    })

    if (!paymentResponse.ok) {
      const paymentError = await paymentResponse.json()
      throw new Error(`決済エラー: ${paymentError.error}`)
    }

    const paymentResult = await paymentResponse.json()
    console.log('✅ Square決済成功:', paymentResult.paymentId)

    // Step 2: Open Shipment作成
    console.log('📦 Open Shipment作成中...')
    const createResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/open-ship/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipperInfo,
        recipientInfo,
        packages: packages.slice(0, 1), // 最初のパッケージで作成
        items,
        serviceType: 'FEDEX_INTERNATIONAL_PRIORITY'
      }),
    })

    if (!createResponse.ok) {
      const createError = await createResponse.json()
      throw new Error(`Open Shipment作成エラー: ${createError.error}`)
    }

    const createResult = await createResponse.json()
    const masterTrackingNumber = createResult.data.masterTrackingNumber
    console.log('✅ Open Shipment作成成功:', masterTrackingNumber)

    // Step 3: 残りのパッケージを追加
    if (packages.length > 1) {
      console.log(`📦 残り${packages.length - 1}個のパッケージを追加中...`)
      
      for (let i = 1; i < packages.length; i++) {
        const addResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/open-ship/add-packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            masterTrackingNumber,
            packages: [packages[i]]
          }),
        })

        if (!addResponse.ok) {
          const addError = await addResponse.json()
          console.warn(`パッケージ${i + 1}の追加に失敗:`, addError.error)
          // エラーでも続行（一部パッケージでも処理を完了させる）
        }
      }
    }

    // Step 4: Open Shipment確定
    console.log('🔒 Open Shipment確定中...')
    const confirmResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/open-ship/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        masterTrackingNumber,
        labelResponseOptions: 'URL_ONLY',
        paymentInfo: {
          sourceId,
          finalCharge,
          paymentId: paymentResult.paymentId
        }
      }),
    })

    if (!confirmResponse.ok) {
      const confirmError = await confirmResponse.json()
      throw new Error(`Open Shipment確定エラー: ${confirmError.error}`)
    }

    const confirmResult = await confirmResponse.json()
    console.log('✅ MPS送り状作成完了')

    return {
      trackingNumber: masterTrackingNumber,
      paymentId: paymentResult.paymentId,
      shipmentId: createResult.data.dbRecordId,
      labelUrls: confirmResult.data.labelUrls,
      packageResponses: confirmResult.data.packageResponses,
      status: confirmResult.data.status
    }

  } catch (error) {
    console.error('❌ MPS送り状作成エラー:', error)
    throw error
  }
} 