import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('受信した送り状データ:', JSON.stringify(body, null, 2))
    
    // 受信データの検証
    const { shipperInfo, recipientInfo, packages, items, contents, shippingPurpose } = body
    
    if (!shipperInfo || !recipientInfo || !packages || !items) {
      return NextResponse.json(
        { error: '必要なデータが不足しています' },
        { status: 400 }
      )
    }
    
    // 送り状処理のシミュレーション
    const trackingNumber = `QLA${Date.now()}`
    const estimatedDelivery = new Date()
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 3)
    
    // TODO: 実際の配送業者API（FedEx等）との連携
    // TODO: データベースへの保存
    // TODO: PDF送り状の生成
    
    const response = {
      success: true,
      trackingNumber,
      estimatedDelivery: estimatedDelivery.toISOString(),
      shippingCost: 8500,
      currency: 'JPY',
      message: '送り状が正常に作成されました',
      shipmentData: {
        shipperInfo,
        recipientInfo,
        packages,
        items,
        contents,
        shippingPurpose
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('送り状作成エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 