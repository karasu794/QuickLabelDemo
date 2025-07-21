import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenShipment, buildOpenShipmentData } from '@/lib/fedex/open-ship'

// リクエストの型定義
interface CreateOpenShipmentRequest {
  shipperInfo: {
    companyName: string
    contactName: string
    taxId?: string
    postalCode: string
    phoneNumber: string
    countryCode: string
    stateCode?: string
    cityName: string
    address1: string
    address2?: string
  }
  recipientInfo: {
    companyName: string
    contactName: string
    taxNumber?: string
    postalCode: string
    phoneNumber: string
    email: string
    countryCode: string
    stateCode?: string
    cityName: string
    address1: string
    address2?: string
    isResidential: boolean
  }
  packages: Array<{
    weight: string
    type: string
    length?: string
    width?: string
    height?: string
    declaredValue?: string
  }>
  items?: Array<{
    description: string
    countryOfManufacture: string
    quantity: number
    weight: number
    unitPrice: number
    currency: string
    hsCode?: string
  }>
  serviceType?: string
  index?: string // オプションのユニークID
}

/**
 * POST /api/open-ship/create
 * Open Shipmentを作成（MPS対応）
 */
export async function POST(request: NextRequest) {
  try {
    const data: CreateOpenShipmentRequest = await request.json()

    console.log('🚀 === Open Shipment作成処理開始 ===')
    console.log('リクエストデータ:', { 
      originCountry: data.shipperInfo.countryCode,
      destinationCountry: data.recipientInfo.countryCode,
      packageCount: data.packages.length,
      hasItems: !!data.items?.length,
      index: data.index
    })

    // 入力データのバリデーション
    if (!data.shipperInfo || !data.recipientInfo || !data.packages?.length) {
      return NextResponse.json(
        { 
          error: '必須データが不足しています',
          details: {
            shipperInfo: !!data.shipperInfo,
            recipientInfo: !!data.recipientInfo,
            packages: !!data.packages?.length
          }
        },
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

    // Open Shipment用データを構築
    const openShipmentData = buildOpenShipmentData(
      data.shipperInfo,
      data.recipientInfo,
      data.packages,
      data.items,
      data.serviceType || 'FEDEX_INTERNATIONAL_PRIORITY'
    )

    // カスタムindexが指定されている場合は設定
    if (data.index) {
      openShipmentData.index = data.index
    }

    console.log('📦 Open Shipment作成中...')
    
    // FedEx Open Ship APIを呼び出し
    const openShipmentResult = await createOpenShipment(openShipmentData)

    console.log('✅ Open Shipment作成完了:', {
      masterTrackingNumber: openShipmentResult.masterTrackingNumber,
      index: openShipmentResult.index,
      alertsCount: openShipmentResult.alerts?.length || 0
    })

    // データベースにOpen Shipment情報を記録
    const { data: openShipmentRecord, error: dbError } = await supabase
      .from('open_shipments')
      .insert({
        user_id: user?.id,
        master_tracking_number: openShipmentResult.masterTrackingNumber,
        fedex_index: openShipmentResult.index,
        status: 'created',
        shipper_info: data.shipperInfo,
        recipient_info: data.recipientInfo,
        service_type: data.serviceType || 'FEDEX_INTERNATIONAL_PRIORITY',
        total_packages: 1, // 最初は1個から開始
        packages_added: 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('データベース記録エラー:', dbError)
      // FedExでは作成済みなので警告レベル
      console.warn('⚠️ Open Shipmentは作成済みですが、DBへの記録に失敗しました')
    }

    return NextResponse.json({
      success: true,
      data: {
        masterTrackingNumber: openShipmentResult.masterTrackingNumber,
        index: openShipmentResult.index,
        status: 'created',
        packageCount: 1,
        dbRecordId: openShipmentRecord?.id,
        alerts: openShipmentResult.alerts,
        notes: openShipmentResult.notes
      }
    })

  } catch (error) {
    console.error('❌ Open Shipment作成エラー:', error)
    
    return NextResponse.json(
      {
        error: 'Open Shipment作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 