import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareError } from 'square'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Square clientの初期化
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
})

// Supabase clientの初期化（サービスロールキー使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// リクエストの型定義
interface ShipmentRequest {
  sourceId: string  // Square決済トークン
  finalCharge: number  // 決済金額
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
  contents?: Array<{
    description: string
    quantity: number
    value: number
    weight: number
    countryOfOrigin: string
    hsCode: string
  }>
  shippingPurpose: string
}

// ユーザー認証の取得（JWTトークンから）
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('認証ヘッダーが見つかりません')
      return null
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.log('ユーザー認証に失敗:', error?.message)
      return null
    }

    return user.id
  } catch (error) {
    console.error('認証処理エラー:', error)
    return null
  }
}

// FedEx認証トークン取得
async function getFedExAccessToken(): Promise<string> {
  const authUrl = process.env.NODE_ENV === 'production' 
    ? 'https://apis.fedex.com/oauth/token'
    : 'https://apis-sandbox.fedex.com/oauth/token'

  try {
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
      const errorText = await response.text()
      console.error('FedEx認証エラー:', errorText)
      throw new Error(`FedEx認証に失敗しました: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.access_token) {
      throw new Error('FedXアクセストークンが取得できませんでした')
    }

    return data.access_token
  } catch (error) {
    console.error('FedX認証処理エラー:', error)
    throw new Error('FedEx認証処理に失敗しました')
  }
}

// FedEx Ship APIリクエストボディ構築
function buildFedExShipmentRequest(data: ShipmentRequest) {
  // 輸出入判定（日本から海外への発送かどうか）
  const isExport = data.shipperInfo.countryCode === 'JP' && data.recipientInfo.countryCode !== 'JP'
  const isImport = data.shipperInfo.countryCode !== 'JP' && data.recipientInfo.countryCode === 'JP'
  
  console.log(`📊 発送タイプ判定: 
    出荷元: ${data.shipperInfo.countryCode}
    仕向地: ${data.recipientInfo.countryCode}
    判定: ${isExport ? '輸出' : isImport ? '輸入' : '国内'}`)
  
  // FedXアカウント番号の選択
  let accountNumber: string
  if (isExport) {
    accountNumber = process.env.FEDEX_ACCOUNT_NUMBER_EXPORT!
    console.log('🌏 輸出用アカウントを使用')
  } else if (isImport) {
    accountNumber = process.env.FEDEX_ACCOUNT_NUMBER_IMPORT!
    console.log('🏠 輸入用アカウントを使用')
  } else {
    // 国内発送の場合は輸出用アカウントをデフォルトとして使用
    accountNumber = process.env.FEDEX_ACCOUNT_NUMBER_EXPORT!
    console.log('🏘️ 国内発送 - 輸出用アカウントを使用')
  }

  // 荷物の総重量計算
  const totalWeight = data.packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight), 0)

  // 商品の総価値計算（contentsがある場合はそちらを優先）
  const totalValue = data.contents && data.contents.length > 0
    ? data.contents.reduce((sum, content) => sum + content.value, 0)
    : data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

  // 配送サービスタイプの決定
  let serviceType: string
  if (isExport || isImport) {
    serviceType = 'FEDEX_INTERNATIONAL_PRIORITY'
  } else {
    serviceType = 'FEDEX_GROUND'
  }

  const shipmentRequest = {
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
          ...(data.shipperInfo.stateCode && { stateOrProvinceCode: data.shipperInfo.stateCode }),
          postalCode: data.shipperInfo.postalCode,
          countryCode: data.shipperInfo.countryCode,
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
            ...(data.recipientInfo.stateCode && { stateOrProvinceCode: data.recipientInfo.stateCode }),
            postalCode: data.recipientInfo.postalCode,
            countryCode: data.recipientInfo.countryCode,
          },
        },
      ],
      shipDatestamp: new Date().toISOString().split('T')[0], // YYYY-MM-DD形式
      serviceType: serviceType,
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
        ...(pkg.type === 'YOUR_PACKAGING' && pkg.length && pkg.width && pkg.height && {
          dimensions: {
            length: parseInt(pkg.length),
            width: parseInt(pkg.width),
            height: parseInt(pkg.height),
            units: 'CM',
          }
        }),
      })),
    },
    accountNumber: {
      value: accountNumber,
    },
  }

  // 国際発送の場合のカスタム情報を追加
  if (isExport || isImport) {
    const commoditiesData = data.contents && data.contents.length > 0
      ? data.contents // contentsが存在する場合はそちらを使用
      : data.items.map(item => ({ // itemsから変換
          description: item.description,
          quantity: item.quantity,
          value: item.unitPrice * item.quantity,
          weight: item.weight,
          countryOfOrigin: item.countryOfManufacture,
          hsCode: item.hsCode || ''
        }))

    const customsClearanceDetail = {
      dutiesPayment: {
        paymentType: 'RECIPIENT',
      },
      documentContent: 'NON_DOCUMENTS',
      customsValue: {
        amount: totalValue,
        currency: data.items[0]?.currency || 'USD',
      },
      commercialInvoice: {
        purpose: data.shippingPurpose === 'COMMERCIAL' ? 'SOLD' :
                data.shippingPurpose === 'GIFT' ? 'GIFT' :
                data.shippingPurpose === 'SAMPLE' ? 'SAMPLE' :
                data.shippingPurpose === 'REPAIR_AND_RETURN' ? 'REPAIR_AND_RETURN' :
                data.shippingPurpose === 'DOCUMENTS' ? 'DOCUMENTS' :
                'PERSONAL_USE',
      },
      commodities: commoditiesData.map(commodity => ({
        description: commodity.description,
        countryOfManufacture: commodity.countryOfOrigin,
        quantity: commodity.quantity,
        quantityUnits: 'PCS',
        unitPrice: {
          amount: commodity.value / commodity.quantity,
          currency: data.items[0]?.currency || 'USD',
        },
        customsValue: {
          amount: commodity.value,
          currency: data.items[0]?.currency || 'USD',
        },
        weight: {
          units: 'KG',
          value: commodity.weight,
        },
        ...(commodity.hsCode && { harmonizedCode: commodity.hsCode }),
      })),
    }

         ;(shipmentRequest as any).requestedShipment.customsClearanceDetail = customsClearanceDetail
  }

  return shipmentRequest
}

export async function POST(request: NextRequest) {
  let paymentId: string | null = null
  let shipmentId: string | null = null

  try {
    const data: ShipmentRequest = await request.json()
    
    console.log('🚀 送り状作成処理を開始:', { 
      sourceId: data.sourceId, 
      finalCharge: data.finalCharge,
      isExport: data.shipperInfo.countryCode === 'JP' && data.recipientInfo.countryCode !== 'JP'
    })

    // Step 1: 入力データのバリデーション
    if (!data.sourceId || !data.finalCharge || !data.shipperInfo || !data.recipientInfo) {
      return NextResponse.json(
        { 
          error: '必須データが不足しています',
          details: {
            sourceId: !!data.sourceId,
            finalCharge: !!data.finalCharge,
            shipperInfo: !!data.shipperInfo,
            recipientInfo: !!data.recipientInfo
          }
        },
        { status: 400 }
      )
    }

    // Step 2: 環境変数の確認
    const requiredEnvVars = [
      'SQUARE_ACCESS_TOKEN',
      'FEDEX_API_KEY',
      'FEDEX_SECRET_KEY',
      'FEDEX_ACCOUNT_NUMBER_EXPORT',
      'FEDEX_ACCOUNT_NUMBER_IMPORT',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    if (missingEnvVars.length > 0) {
      console.error('Missing environment variables:', missingEnvVars)
      return NextResponse.json(
        { 
          error: '必要な環境変数が設定されていません',
          missingVars: missingEnvVars
        },
        { status: 500 }
      )
    }

    // Step 3: ユーザー認証情報の取得（任意）
    const userId = await getUserFromRequest(request)
    console.log('👤 ユーザー認証:', userId ? '認証済み' : 'ゲストユーザー')

    // Step 4: Square決済の実行
    console.log('💳 Square決済の実行中...')
    const idempotencyKey = randomUUID()
    
    try {
      const createPaymentRequest = {
        sourceId: data.sourceId,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: BigInt(data.finalCharge),
          currency: 'JPY' as const
        }
      }

      const paymentResponse = await squareClient.payments.create(createPaymentRequest)
      
      if (!paymentResponse.payment?.id) {
        throw new Error('決済レスポンスが無効です')
      }

      if (paymentResponse.payment.status !== 'COMPLETED') {
        throw new Error(`決済が完了していません。ステータス: ${paymentResponse.payment.status}`)
      }

      paymentId = paymentResponse.payment.id
      console.log('✅ Square決済実行完了:', paymentId)

    } catch (error) {
      console.error('Square決済エラー:', error)
      if (error instanceof SquareError) {
        const errorMessage = error.errors?.[0]?.detail || 'Square決済でエラーが発生しました'
        return NextResponse.json(
          { 
            error: '決済処理に失敗しました',
            details: errorMessage,
            step: 'payment'
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Step 5: FedX認証とアクセストークン取得
    console.log('🔐 FedX認証中...')
    let fedexAccessToken: string
    try {
      fedexAccessToken = await getFedExAccessToken()
      console.log('✅ FedX認証完了')
    } catch (error) {
      console.error('FedX認証エラー:', error)
      return NextResponse.json(
        { 
          error: 'FedX認証に失敗しました',
          details: error instanceof Error ? error.message : '不明なエラー',
          step: 'fedex_auth',
          paymentId: paymentId // 決済は成功しているので決済IDを返す
        },
        { status: 500 }
      )
    }

    // Step 6: FedX Ship APIリクエスト構築と実行
    console.log('📦 FedX送り状リクエスト構築中...')
    let fedexResult: any
    let trackingNumber: string
    let labelUrl: string | undefined

    try {
      const fedexShipmentRequest = buildFedExShipmentRequest(data)
      console.log('🚚 FedX Ship API呼び出し中...')

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
        console.error('FedX Ship APIエラー:', errorText)
        throw new Error(`FedX送り状作成に失敗しました: ${fedexResponse.status} - ${errorText}`)
      }

      fedexResult = await fedexResponse.json()
      console.log('✅ FedX送り状作成完了')

      // 追跡番号とラベルURL抽出
      trackingNumber = fedexResult.output?.transactionShipments?.[0]?.masterTrackingNumber
      labelUrl = fedexResult.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.url

      if (!trackingNumber) {
        throw new Error('FedXから追跡番号を取得できませんでした')
      }

      console.log('📋 追跡番号:', trackingNumber)

    } catch (error) {
      console.error('FedX送り状作成エラー:', error)
      return NextResponse.json(
        { 
          error: 'FedX送り状作成に失敗しました',
          details: error instanceof Error ? error.message : '不明なエラー',
          step: 'fedex_shipping',
          paymentId: paymentId // 決済は成功しているので決済IDを返す
        },
        { status: 500 }
      )
    }

    // Step 7: Supabaseへのデータ保存
    console.log('💾 データベースへの保存中...')
    shipmentId = randomUUID()

    try {
      const shipmentData = {
        id: shipmentId,
        payment_id: paymentId,
        tracking_number: trackingNumber,
        label_url: labelUrl,
        status: 'created',
        total_amount: data.finalCharge,
        user_id: userId, // 認証されたユーザーのID（ゲストの場合はnull）
        
        // 荷送人情報
        shipper_company: data.shipperInfo.companyName,
        shipper_contact: data.shipperInfo.contactName,
        shipper_phone: data.shipperInfo.phoneNumber,
        shipper_postal_code: data.shipperInfo.postalCode,
        shipper_city: data.shipperInfo.cityName,
        shipper_address1: data.shipperInfo.address1,
        shipper_address2: data.shipperInfo.address2,
        shipper_country: data.shipperInfo.countryCode,
        shipper_state: data.shipperInfo.stateCode,
        
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
        recipient_state: data.recipientInfo.stateCode,
        
        // 荷物・商品情報
        packages: JSON.stringify(data.packages),
        items: JSON.stringify(data.items),
        contents: data.contents ? JSON.stringify(data.contents) : null,
        shipping_purpose: data.shippingPurpose,
        
        // FedX応答データ
        fedex_response: JSON.stringify(fedexResult),
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('shipments')
        .insert([shipmentData])

      if (insertError) {
        console.error('Supabase保存エラー:', insertError)
        throw new Error(`データベースへの保存に失敗しました: ${insertError.message}`)
      }

      console.log('✅ データベース保存完了')

    } catch (error) {
      console.error('データベース保存エラー:', error)
      return NextResponse.json(
        { 
          error: 'データベースへの保存に失敗しました',
          details: error instanceof Error ? error.message : '不明なエラー',
          step: 'database_save',
          paymentId: paymentId,
          trackingNumber: trackingNumber // 送り状は作成できているので追跡番号を返す
        },
        { status: 500 }
      )
    }

    // Step 8: 最終応答
    console.log('🎉 送り状作成処理完了!')
    return NextResponse.json({
      success: true,
      trackingNumber: trackingNumber,
      labelUrl: labelUrl,
      paymentId: paymentId,
      shipmentId: shipmentId,
      message: '送り状が正常に作成されました'
    })

  } catch (error: unknown) {
    console.error('送り状作成処理で予期しないエラー:', error)
    
    // 予期しないエラーの場合の最終的なエラーレスポンス
    return NextResponse.json(
      { 
        error: '送り状作成処理で予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
        step: 'unexpected_error',
        ...(paymentId && { paymentId }),
        ...(shipmentId && { shipmentId })
      },
      { status: 500 }
    )
  }
} 