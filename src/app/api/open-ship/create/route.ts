import { NextRequest, NextResponse } from 'next/server'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import { createOpenShipment, buildOpenShipmentData } from '@/lib/fedex/open-ship'
import type { Database } from '@/types/supabase'

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

    // 認証（単一ユーザー方式）
    const { supabase, user } = await getUserOrThrow()
    const userId = user.id
    const orgId = null // TODO(org-removed)

    // Open Shipment用データを構築
    // 一度のみ為替取得
    let jpyToUsd = 1/150
    try {
      const { ExchangeRateService } = await import('@/lib/services/exchangeRateService')
      const usdToJpy = await ExchangeRateService.getExchangeRate()
      if (usdToJpy > 0) jpyToUsd = 1 / usdToJpy
    } catch {}

    const openShipmentData = buildOpenShipmentData(
      data.shipperInfo,
      data.recipientInfo,
      data.packages,
      data.items,
      data.serviceType || 'FEDEX_INTERNATIONAL_PRIORITY',
      jpyToUsd
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
    const { data: openShipmentRecord, error: dbError } = await (supabase
      .from('open_shipments') as any)
      .insert({
        // TODO(org-removed): org_id deprecated
        created_by: userId,
        master_tracking_number: openShipmentResult.masterTrackingNumber,
        fedex_index: openShipmentResult.index,
        status: 'created',
        shipper_info: data.shipperInfo,
        recipient_info: data.recipientInfo,
        service_type: data.serviceType || 'FEDEX_INTERNATIONAL_PRIORITY',
        total_packages: 1, // 最初は1個から開始
        packages_added: 1,
        created_at: new Date().toISOString()
      } as any)
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