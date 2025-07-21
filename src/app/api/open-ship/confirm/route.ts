import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmOpenShipment, getOpenShipmentResults } from '@/lib/fedex/open-ship'

// リクエストの型定義
interface ConfirmShipmentRequest {
  masterTrackingNumber?: string
  index?: string // masterTrackingNumberまたはindexのいずれかが必要
  accountNumber?: string // 指定されない場合は環境変数から取得
  labelResponseOptions?: 'URL_ONLY' | 'LABEL_DATA_ONLY'
  // 決済情報（オプション）
  paymentInfo?: {
    sourceId: string // Square決済トークン
    finalCharge: number // 決済金額
  }
}

/**
 * POST /api/open-ship/confirm
 * Open Shipmentを確定してラベルを生成
 */
export async function POST(request: NextRequest) {
  try {
    const data: ConfirmShipmentRequest = await request.json()

    console.log('🚀 === Open Shipment確定処理開始 ===')
    console.log('リクエストデータ:', { 
      masterTrackingNumber: data.masterTrackingNumber,
      index: data.index,
      labelResponseOptions: data.labelResponseOptions || 'URL_ONLY',
      hasPayment: !!data.paymentInfo
    })

    // 入力データのバリデーション
    if (!data.masterTrackingNumber && !data.index) {
      return NextResponse.json(
        { error: 'masterTrackingNumberまたはindexのいずれかが必要です' },
        { status: 400 }
      )
    }

    // Supabaseクライアント初期化
    const supabase = createClient()

    // ユーザー認証状態を確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('ユーザー認証エラー:', userError)
      return NextResponse.json(
        { error: 'ユーザー認証に失敗しました' },
        { status: 401 }
      )
    }

    // データベースからOpen Shipment情報を取得
    let openShipmentQuery = supabase
      .from('open_shipments')
      .select('*')

    if (data.masterTrackingNumber) {
      openShipmentQuery = openShipmentQuery.eq('master_tracking_number', data.masterTrackingNumber)
    } else if (data.index) {
      openShipmentQuery = openShipmentQuery.eq('fedex_index', data.index)
    }

    // ユーザー権限チェック
    if (user) {
      openShipmentQuery = openShipmentQuery.eq('user_id', user.id)
    }

    const { data: openShipment, error: queryError } = await openShipmentQuery.single()

    if (queryError || !openShipment) {
      console.error('Open Shipment検索エラー:', queryError)
      return NextResponse.json(
        { error: 'Open Shipmentが見つかりません' },
        { status: 404 }
      )
    }

    // ステータスチェック
    if (openShipment.status === 'confirmed') {
      return NextResponse.json(
        { error: 'このOpen Shipmentは既に確定済みです' },
        { status: 400 }
      )
    }

    if (openShipment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'このOpen Shipmentはキャンセル済みです' },
        { status: 400 }
      )
    }

    // パッケージが追加されているかチェック
    if (openShipment.packages_added < 1) {
      return NextResponse.json(
        { error: 'パッケージが追加されていません' },
        { status: 400 }
      )
    }

    // アカウント番号を決定
    const accountNumber = data.accountNumber || process.env.FEDEX_ACCOUNT_NUMBER!

    // 決済処理（Square API）- オプション
    let paymentId: string | null = null
    if (data.paymentInfo) {
      try {
        console.log('💳 Square決済処理開始...')
        
        const squareResponse = await fetch('https://connect.squareupsandbox.com/v2/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Square-Version': '2023-10-18',
          },
          body: JSON.stringify({
            source_id: data.paymentInfo.sourceId,
            amount_money: {
              amount: Math.round(data.paymentInfo.finalCharge),
              currency: 'JPY',
            },
            idempotency_key: `os-${openShipment.id}-${Date.now()}`,
            autocomplete: true,
            location_id: process.env.SQUARE_LOCATION_ID,
            reference_id: `OpenShipment-${openShipment.master_tracking_number}`,
            note: `Open Shipment ${openShipment.total_packages}個口 - ${openShipment.master_tracking_number}`,
          }),
        })

        if (!squareResponse.ok) {
          const errorText = await squareResponse.text()
          throw new Error(`Square決済エラー: ${squareResponse.status} ${errorText}`)
        }

        const squareResult = await squareResponse.json()
        paymentId = squareResult.payment?.id
        
        console.log('✅ Square決済完了:', paymentId)
        
      } catch (paymentError) {
        console.error('❌ Square決済エラー:', paymentError)
        return NextResponse.json(
          {
            error: '決済処理に失敗しました',
            details: paymentError instanceof Error ? paymentError.message : '不明な決済エラー'
          },
          { status: 400 }
        )
      }
    }

    console.log(`🏷️ Open Shipment確定中... (${openShipment.total_packages}個口)`)

    // FedEx Open Ship APIで確定
    const confirmResult = await confirmOpenShipment(
      accountNumber,
      data.index || data.masterTrackingNumber!,
      data.labelResponseOptions || 'URL_ONLY'
    )

    // 40個超の場合は非同期処理
    if (confirmResult.jobId) {
      console.log('⏳ 大量パッケージのため非同期処理中...', confirmResult.jobId)
      
      // データベースを更新（jobId保存）
      await supabase
        .from('open_shipments')
        .update({
          status: 'processing',
          fedex_job_id: confirmResult.jobId,
          confirmed_at: new Date().toISOString(),
          ...(paymentId && { payment_id: paymentId }),
          updated_at: new Date().toISOString()
        })
        .eq('id', openShipment.id)

      return NextResponse.json({
        success: true,
        data: {
          masterTrackingNumber: confirmResult.masterTrackingNumber,
          status: 'processing',
          jobId: confirmResult.jobId,
          totalPackages: openShipment.total_packages,
          message: '大量パッケージのため非同期処理中です。結果は別途取得してください。',
          alerts: confirmResult.alerts,
          ...(paymentId && { paymentId })
        }
      })
    }

    // 同期処理の場合はラベルが即座に返される
    console.log('✅ Open Shipment確定完了:', {
      masterTrackingNumber: confirmResult.masterTrackingNumber,
      packageCount: confirmResult.packageResponses.length,
      labelsGenerated: confirmResult.packageResponses.filter(p => p.packageDocuments?.length).length
    })

    // ラベルURLを抽出
    const labelUrls = confirmResult.packageResponses
      .map(pkg => pkg.packageDocuments?.[0]?.url)
      .filter(url => url)

    // データベースを更新
    await supabase
      .from('open_shipments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        label_urls: labelUrls.filter((url): url is string => url !== undefined),
        tracking_numbers: confirmResult.packageResponses.map(p => p.trackingNumber),
        ...(paymentId && { payment_id: paymentId }),
        updated_at: new Date().toISOString()
      })
      .eq('id', openShipment.id)

    return NextResponse.json({
      success: true,
      data: {
        masterTrackingNumber: confirmResult.masterTrackingNumber,
        status: 'confirmed',
        packageResponses: confirmResult.packageResponses,
        labelUrls: labelUrls,
        totalPackages: openShipment.total_packages,
        alerts: confirmResult.alerts,
        ...(paymentId && { paymentId })
      }
    })

  } catch (error) {
    console.error('❌ Open Shipment確定エラー:', error)
    
    return NextResponse.json(
      {
        error: 'Open Shipment確定に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/open-ship/confirm?jobId=xxx&accountNumber=xxx
 * 非同期処理結果を取得（40個超の場合）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const accountNumber = searchParams.get('accountNumber') || process.env.FEDEX_ACCOUNT_NUMBER!

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobIdが必要です' },
        { status: 400 }
      )
    }

    console.log('🔍 非同期処理結果取得中...', jobId)

    // FedEx APIから結果を取得
    const results = await getOpenShipmentResults(accountNumber, jobId)

    console.log('✅ 非同期処理結果取得完了:', {
      masterTrackingNumber: results.masterTrackingNumber,
      packageCount: results.packageResponses.length
    })

    // データベースを更新
    const supabase = createClient()
    const labelUrls = results.packageResponses
      .map(pkg => pkg.packageDocuments?.[0]?.url)
      .filter(url => url)

    await supabase
      .from('open_shipments')
      .update({
        status: 'confirmed',
        label_urls: labelUrls.filter((url): url is string => url !== undefined),
        tracking_numbers: results.packageResponses.map(p => p.trackingNumber),
        updated_at: new Date().toISOString()
      })
      .eq('fedex_job_id', jobId)

    return NextResponse.json({
      success: true,
      data: {
        masterTrackingNumber: results.masterTrackingNumber,
        status: 'confirmed',
        packageResponses: results.packageResponses,
        labelUrls: labelUrls,
        alerts: results.alerts
      }
    })

  } catch (error) {
    console.error('❌ 非同期処理結果取得エラー:', error)
    
    return NextResponse.json(
      {
        error: '非同期処理結果の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 