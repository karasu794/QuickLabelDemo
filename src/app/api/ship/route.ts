import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareError } from 'square'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Square clientの初期化
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
})

// Supabase clientの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// リクエストの型定義
interface ShipmentRequest {
  paymentId: string
  shipperInfo: {
    companyName: string
    contactName: string
    postalCode: string
    phoneNumber: string
    cityName: string
    address1: string
    address2?: string
  }
  recipientInfo: {
    companyName: string
    contactName: string
    postalCode: string
    phoneNumber: string
    email: string
    countryCode: string
    cityName: string
    address1: string
    address2?: string
  }
  packages: Array<{
    weight: string
    type: string
    length?: string
    width?: string
    height?: string
  }>
  items: Array<{
    description: string
    countryOfManufacture: string
    quantity: number
    weight: number
    unitPrice: number
    currency: string
    hsCode?: string
  }>
  contents?: any
  shippingPurpose: string
  totalAmount: number
}

// FedEx認証トークン取得
async function getFedExAccessToken(): Promise<string> {
  const authUrl = process.env.NODE_ENV === 'production' 
    ? 'https://apis.fedex.com/oauth/token'
    : 'https://apis-sandbox.fedex.com/oauth/token'

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.FEDEX_API_KEY!,
      client_secret: process.env.FEDEX_SECRET_KEY!,
    }),
  })

  if (!response.ok) {
    throw new Error('FedEx認証に失敗しました')
  }

  const data = await response.json()
  return data.access_token
}

// FedEx Ship APIリクエストボディ構築
function buildFedExShipmentRequest(data: ShipmentRequest) {
  // 輸出入判定（日本国内 vs 海外）
  const isExport = data.recipientInfo.countryCode !== 'JP'
  
  // FedExアカウント番号の選択
  const accountNumber = isExport 
    ? process.env.FEDEX_ACCOUNT_NUMBER_EXPORT
    : process.env.FEDEX_ACCOUNT_NUMBER_IMPORT

  // 荷物の総重量計算
  const totalWeight = data.packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight), 0)

  // 商品の総価値計算
  const totalValue = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  return {
    labelResponseOptions: 'URL_ONLY',
    requestedShipment: {
      shipper: {
        contact: {
          personName: data.shipperInfo.contactName,
          phoneNumber: data.shipperInfo.phoneNumber,
          companyName: data.shipperInfo.companyName,
        },
        address: {
          streetLines: [
            data.shipperInfo.address1,
            data.shipperInfo.address2
          ].filter(Boolean),
          city: data.shipperInfo.cityName,
          postalCode: data.shipperInfo.postalCode,
          countryCode: 'JP',
        },
      },
      recipients: [
        {
          contact: {
            personName: data.recipientInfo.contactName,
            phoneNumber: data.recipientInfo.phoneNumber,
            emailAddress: data.recipientInfo.email,
            companyName: data.recipientInfo.companyName,
          },
          address: {
            streetLines: [
              data.recipientInfo.address1,
              data.recipientInfo.address2
            ].filter(Boolean),
            city: data.recipientInfo.cityName,
            postalCode: data.recipientInfo.postalCode,
            countryCode: data.recipientInfo.countryCode,
          },
        },
      ],
      shipDatestamp: new Date().toISOString().split('T')[0], // YYYY-MM-DD形式
      serviceType: isExport ? 'FEDEX_INTERNATIONAL_PRIORITY' : 'FEDEX_GROUND',
      packagingType: data.packages[0]?.type === 'YOUR_PACKAGING' ? 'YOUR_PACKAGING' : 'FEDEX_BOX',
      pickupType: 'USE_SCHEDULED_PICKUP',
      blockInsightVisibility: false,
      shippingChargesPayment: {
        paymentType: 'SENDER',
        payor: {
          responsibleParty: {
            accountNumber: {
              value: accountNumber,
            },
          },
        },
      },
      labelSpecification: {
        imageType: 'PDF',
        labelStockType: 'PAPER_85X11_TOP_HALF_LABEL',
      },
      requestedPackageLineItems: data.packages.map((pkg, index) => ({
        sequenceNumber: index + 1,
        groupPackageCount: 1,
        weight: {
          units: 'KG',
          value: parseFloat(pkg.weight),
        },
        dimensions: pkg.type === 'YOUR_PACKAGING' ? {
          length: parseInt(pkg.length || '0'),
          width: parseInt(pkg.width || '0'),
          height: parseInt(pkg.height || '0'),
          units: 'CM',
        } : undefined,
      })),
      // 国際発送の場合のカスタム情報
      ...(isExport && {
        customsClearanceDetail: {
          dutiesPayment: {
            paymentType: 'RECIPIENT',
          },
          documentContent: 'NON_DOCUMENTS',
          customsValue: {
            amount: totalValue,
            currency: data.items[0]?.currency || 'USD',
          },
          commercialInvoice: {
            purpose: data.shippingPurpose === 'commercial' ? 'SOLD' : 'GIFT',
          },
          commodities: data.items.map(item => ({
            description: item.description,
            countryOfManufacture: item.countryOfManufacture,
            quantity: item.quantity,
            quantityUnits: 'PCS',
            unitPrice: {
              amount: item.unitPrice,
              currency: item.currency,
            },
            customsValue: {
              amount: item.unitPrice * item.quantity,
              currency: item.currency,
            },
            weight: {
              units: 'KG',
              value: item.weight,
            },
            ...(item.hsCode && { harmonizedCode: item.hsCode }),
          })),
        },
      }),
    },
    accountNumber: {
      value: accountNumber,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: ShipmentRequest = await request.json()
    
    // バリデーション
    if (!data.paymentId || !data.totalAmount || !data.shipperInfo || !data.recipientInfo) {
      return NextResponse.json(
        { error: '必須データが不足しています' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    const requiredEnvVars = [
      'SQUARE_ACCESS_TOKEN',
      'FEDEX_API_KEY',
      'FEDEX_SECRET_KEY',
      'FEDEX_ACCOUNT_NUMBER_EXPORT',
      'FEDEX_ACCOUNT_NUMBER_IMPORT',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`Missing environment variable: ${envVar}`)
        return NextResponse.json(
          { error: `環境変数 ${envVar} が設定されていません` },
          { status: 500 }
        )
      }
    }

    console.log('🚀 送り状作成処理を開始:', { paymentId: data.paymentId, totalAmount: data.totalAmount })

    // Step 1: Square決済の確認
    console.log('💳 Square決済の確認中...')
    const paymentResponse = await squareClient.payments.get({
      paymentId: data.paymentId
    })
    
    if (!paymentResponse.payment || paymentResponse.payment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: '決済が完了していません' },
        { status: 400 }
      )
    }

    console.log('✅ Square決済確認完了:', paymentResponse.payment.id)

    // Step 2: FedEx認証とアクセストークン取得
    console.log('🔐 FedEx認証中...')
    const fedexAccessToken = await getFedExAccessToken()
    console.log('✅ FedEx認証完了')

    // Step 3: FedEx Ship APIリクエスト構築
    console.log('📦 FedEx送り状リクエスト構築中...')
    const fedexShipmentRequest = buildFedExShipmentRequest(data)

    // Step 4: FedEx Ship API呼び出し
    console.log('🚚 FedEx Ship API呼び出し中...')
    const fedexShipUrl = process.env.NODE_ENV === 'production'
      ? 'https://apis.fedex.com/ship/v1/shipments'
      : 'https://apis-sandbox.fedex.com/ship/v1/shipments'

    const fedexResponse = await fetch(fedexShipUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fedexAccessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'ja_JP',
      },
      body: JSON.stringify(fedexShipmentRequest),
    })

    if (!fedexResponse.ok) {
      const errorText = await fedexResponse.text()
      console.error('FedEx Ship APIエラー:', errorText)
      throw new Error(`FedEx送り状作成に失敗しました: ${fedexResponse.status}`)
    }

    const fedexResult = await fedexResponse.json()
    console.log('✅ FedEx送り状作成完了')

    // 追跡番号とラベルURL抽出
    const trackingNumber = fedexResult.output?.transactionShipments?.[0]?.masterTrackingNumber
    const labelUrl = fedexResult.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.url

    if (!trackingNumber) {
      throw new Error('FedExから追跡番号を取得できませんでした')
    }

    console.log('📋 追跡番号:', trackingNumber)

    // Step 5: Supabaseへのデータ保存
    console.log('💾 データベースへの保存中...')
    const shipmentData = {
      id: randomUUID(),
      payment_id: data.paymentId,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      status: 'created',
      total_amount: data.totalAmount,
      
      // 荷送人情報
      shipper_company: data.shipperInfo.companyName,
      shipper_contact: data.shipperInfo.contactName,
      shipper_phone: data.shipperInfo.phoneNumber,
      shipper_postal_code: data.shipperInfo.postalCode,
      shipper_city: data.shipperInfo.cityName,
      shipper_address1: data.shipperInfo.address1,
      shipper_address2: data.shipperInfo.address2,
      
      // 荷受人情報
      recipient_company: data.recipientInfo.companyName,
      recipient_contact: data.recipientInfo.contactName,
      recipient_phone: data.recipientInfo.phoneNumber,
      recipient_email: data.recipientInfo.email,
      recipient_country: data.recipientInfo.countryCode,
      recipient_postal_code: data.recipientInfo.postalCode,
      recipient_city: data.recipientInfo.cityName,
      recipient_address1: data.recipientInfo.address1,
      recipient_address2: data.recipientInfo.address2,
      
      // 荷物・商品情報
      packages: JSON.stringify(data.packages),
      items: JSON.stringify(data.items),
      shipping_purpose: data.shippingPurpose,
      
      // FedEx応答データ
      fedex_response: JSON.stringify(fedexResult),
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase
      .from('shipments')
      .insert([shipmentData])

    if (insertError) {
      console.error('Supabase保存エラー:', insertError)
      throw new Error('データベースへの保存に失敗しました')
    }

    console.log('✅ データベース保存完了')

    // Step 6: 最終応答
    console.log('🎉 送り状作成処理完了!')
    return NextResponse.json({
      success: true,
      trackingNumber: trackingNumber,
      labelUrl: labelUrl,
      paymentId: data.paymentId,
      shipmentId: shipmentData.id,
      message: '送り状が正常に作成されました'
    })

  } catch (error: unknown) {
    console.error('送り状作成エラー:', error)
    
    if (error instanceof SquareError) {
      const errorMessage = error.errors?.[0]?.detail || 'Square APIエラーが発生しました'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '送り状作成に失敗しました',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 