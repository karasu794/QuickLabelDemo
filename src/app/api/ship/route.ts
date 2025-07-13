import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment, SquareError } from 'square'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Square clientの初期化（動的）
function getSquareClient() {
  console.log('🔧 Square SDK設定:')
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`  SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN ? '設定済み' : '未設定'}`)
  console.log(`  SQUARE_APPLICATION_ID: ${process.env.SQUARE_APPLICATION_ID ? '設定済み' : '未設定'}`)
  
  // アクセストークンの詳細チェック
  const accessToken = process.env.SQUARE_ACCESS_TOKEN!
  const tokenPrefix = accessToken.substring(0, 10)
  console.log(`  Access Token Prefix: ${tokenPrefix}`)
  
  if (process.env.NODE_ENV !== 'production') {
    // Sandbox環境のトークンチェック
    if (accessToken.includes('sandbox')) {
      console.log('  ✅ Sandbox用トークンを検出')
    } else {
      console.log('  ⚠️ Sandbox用トークンではない可能性があります')
    }
  }
  
  try {
    // Square SDK v43の正しい設定
    const config: any = {
      token: accessToken
    }
    
    // 環境設定（v43では SquareEnvironment を使用）
    if (process.env.NODE_ENV === 'production') {
      config.environment = SquareEnvironment.Production
      console.log('  Environment: production')
    } else {
      config.environment = SquareEnvironment.Sandbox
      console.log('  Environment: sandbox')
    }
    
    console.log('  Square Config:', { 
      environment: config.environment === SquareEnvironment.Sandbox ? 'sandbox' : 'production',
      hasToken: !!config.token
    })
    
    const client = new SquareClient(config)
    console.log('  ✅ Square Client初期化成功')
    return client
  } catch (error) {
    console.error('  ❌ Square Client初期化エラー:', error)
    throw error
  }
}

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

// FedX Shipmentリクエストの共通部分を構築
function buildBaseFedExShipmentRequest(data: ShipmentRequest) {
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
    accountNumber = process.env.FEDEX_EXPORT_ACCOUNT_NUMBER!
    console.log('🌏 輸出用アカウントを使用')
  } else if (isImport) {
    accountNumber = process.env.FEDEX_IMPORT_ACCOUNT_NUMBER!
    console.log('🏠 輸入用アカウントを使用')
  } else {
    // 国内発送の場合は輸出用アカウントをデフォルトとして使用
    accountNumber = process.env.FEDEX_EXPORT_ACCOUNT_NUMBER!
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

  // 基本的な送り状リクエスト構造
  const baseRequest = {
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
      totalWeight: totalWeight,
    },
    accountNumber: {
      value: accountNumber,
    },
  }

  // 国際配送の場合は税関情報を追加
  if (isExport || isImport) {
    const commoditiesData = data.contents && data.contents.length > 0 ? data.contents : data.items
    
    // 通貨コードを大文字ISO 4217形式に統一する関数
    const normalizeCurrency = (currency?: string): string => {
      if (!currency) return 'USD'
      const upperCurrency = currency.toUpperCase().trim()
      
      // FedXの国際配送では、JPYの代わりにUSDを使用
      if (upperCurrency === 'JPY') {
        return 'USD'
      }
      
      return upperCurrency
    }
    
    // JPYからUSDへの変換関数（簡易的な固定レート）
    const convertJPYtoUSD = (amountJPY: number): number => {
      const JPY_TO_USD_RATE = 0.0067 // 1 JPY = 0.0067 USD (概算)
      const convertedAmount = amountJPY * JPY_TO_USD_RATE
      
      // FedXの最小金額制限を考慮（$1.00未満の場合は$1.00とする）
      return Math.max(convertedAmount, 1.00)
    }
    
    // 総申告価額を計算（各商品の変換後金額の合計）
    const totalCustomsAmount = commoditiesData.reduce((sum: number, item: any) => {
      // contentsの場合はvalue、itemsの場合はunitPrice * quantityを使用
      const itemValue = item.value !== undefined ? item.value : (item.unitPrice * item.quantity)
      const originalCurrency = item.currency || 'JPY'
      
      // JPYの場合はUSDに変換
      const convertedValue = originalCurrency === 'JPY' || !originalCurrency
        ? convertJPYtoUSD(itemValue)
        : itemValue
      
      return sum + convertedValue
    }, 0)
    
    console.log('💰 通貨変換情報:')
    console.log(`  総申告価額: ${totalCustomsAmount.toFixed(2)} USD`)
    console.log(`  商品数: ${commoditiesData.length}件`)
    
    ;(baseRequest as any).requestedShipment.customsClearanceDetail = {
      commercialInvoice: {
        purpose: 'SOLD',  // 商用利用として最適な発送目的を設定
      },
      dutiesPayment: {
        paymentType: 'RECIPIENT',
      },
      totalCustomsValue: {
        amount: parseFloat(totalCustomsAmount.toFixed(2)),
        currency: 'USD',
      },
              commodities: commoditiesData.map((item: any, index: number) => {
          const originalCurrency = item.currency || 'JPY'
          const itemCurrency = normalizeCurrency(originalCurrency)
          const unitPriceAmount = item.value ? item.value / item.quantity : item.unitPrice
          const customsValueAmount = item.value || (item.unitPrice * item.quantity)
          
          // JPYの場合はUSDに変換
          const convertedUnitPrice = originalCurrency === 'JPY' || !originalCurrency
            ? convertJPYtoUSD(unitPriceAmount)
            : unitPriceAmount
          const convertedCustomsValue = originalCurrency === 'JPY' || !originalCurrency
            ? convertJPYtoUSD(customsValueAmount)
            : customsValueAmount
          
          console.log(`  商品${index + 1}: ${item.description}`)
          console.log(`    元の価値: ${customsValueAmount} ${originalCurrency}`)
          console.log(`    変換後価値: ${convertedCustomsValue.toFixed(2)} USD`)
          console.log(`    単価: ${convertedUnitPrice.toFixed(2)} USD`)
          
          return {
            description: item.description,
            countryOfManufacture: item.countryOfOrigin || item.countryOfManufacture,
            quantity: item.quantity,
        quantityUnits: 'PCS',
        unitPrice: {
              amount: parseFloat(convertedUnitPrice.toFixed(2)),
              currency: itemCurrency,
        },
        customsValue: {
              amount: parseFloat(convertedCustomsValue.toFixed(2)),
              currency: itemCurrency,
        },
        weight: {
          units: 'KG',
              value: item.weight,
            },
            ...(item.hsCode && { harmonizedCode: item.hsCode }),
          }
        }),
    }
  }

  return baseRequest
}

// Step 2: FedX Validate Shipment APIを呼び出す
async function validateFedExShipment(accessToken: string, data: ShipmentRequest) {
  const validateUrl = process.env.NODE_ENV === 'production'
    ? 'https://apis.fedex.com/ship/v1/shipments/packages/validate'
    : 'https://apis-sandbox.fedex.com/ship/v1/shipments/packages/validate'

  try {
    const baseRequest = buildBaseFedExShipmentRequest(data)
    
    // Validate Shipment用の追加設定
    const validateRequest = {
      ...baseRequest,
      requestedShipment: {
        ...baseRequest.requestedShipment,
        labelSpecification: {
          imageType: 'PDF',
          labelStockType: 'PAPER_LETTER',
        },
      },
    }
    
    console.log('🔍 FedX Validate Shipment API呼び出し中...')
    console.log('Validate Request:', JSON.stringify(validateRequest, null, 2))

    // デバッグ用：FedXに送信するリクエスト内容をコンソールに出力
    console.log("--- FedX API Request Body ---");
    console.log(JSON.stringify(validateRequest, null, 2));
    console.log("----------------------------");

    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'ja_JP',
      },
      body: JSON.stringify(validateRequest),
    })

    const responseText = await response.text()
    console.log(`FedX Validate レスポンス: ${response.status}`)
    console.log('Validate Response:', responseText)

    if (!response.ok) {
      let errorMessage = 'FedX送り状検証に失敗しました'
      
      console.log('🔍 FedX Validate エラー詳細分析:')
      console.log('Status:', response.status)
      console.log('Response:', responseText)
      
      try {
        const errorData = JSON.parse(responseText)
        console.log('Parsed Error Data:', JSON.stringify(errorData, null, 2))
        
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map((error: any) => 
            `${error.code}: ${error.message}`
          ).join(', ')
          
          console.log('📋 FedX エラー詳細:')
          errorData.errors.forEach((error: any, index: number) => {
            console.log(`  Error ${index + 1}:`, {
              code: error.code,
              message: error.message,
              details: error.details
            })
          })
        }
      } catch (parseError) {
        console.log('⚠️ FedX レスポンス解析エラー:', parseError)
        errorMessage = `HTTP ${response.status}: ${responseText}`
      }
      
      throw new Error(errorMessage)
    }

    const validateResult = JSON.parse(responseText)
    console.log('✅ FedX送り状検証完了')
    return validateResult

  } catch (error) {
    console.error('FedX Validate Shipment APIエラー:', error)
    throw error
  }
}

// Step 5: FedX Ship APIを呼び出す（本発行）
async function createFedExShipment(accessToken: string, data: ShipmentRequest) {
  const shipUrl = process.env.NODE_ENV === 'production'
    ? 'https://apis.fedex.com/ship/v1/shipments'
    : 'https://apis-sandbox.fedex.com/ship/v1/shipments'

  try {
    const baseRequest = buildBaseFedExShipmentRequest(data)
    
    // 本発行用の追加設定
    const shipmentRequest = {
      ...baseRequest,
      labelResponseOptions: 'URL_ONLY',
      requestedShipment: {
        ...baseRequest.requestedShipment,
        labelSpecification: {
          imageType: 'PDF',
          labelStockType: 'PAPER_85X11_TOP_HALF_LABEL',
        },
      },
    }
    
    console.log('📦 FedX Ship API呼び出し中...')
    console.log('Ship Request:', JSON.stringify(shipmentRequest, null, 2))

    // デバッグ用：FedXに送信するリクエスト内容をコンソールに出力
    console.log("--- FedX Ship API Request Body ---");
    console.log(JSON.stringify(shipmentRequest, null, 2));
    console.log("-----------------------------------");

    const response = await fetch(shipUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'ja_JP',
      },
      body: JSON.stringify(shipmentRequest),
    })

    const responseText = await response.text()
    console.log(`FedX Ship レスポンス: ${response.status}`)
    console.log('Ship Response:', responseText)

    if (!response.ok) {
      let errorMessage = 'FedX送り状作成に失敗しました'
      
      console.log('🔍 FedX Ship エラー詳細分析:')
      console.log('Status:', response.status)
      console.log('Response:', responseText)
      
      try {
        const errorData = JSON.parse(responseText)
        console.log('Parsed Error Data:', JSON.stringify(errorData, null, 2))
        
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map((error: any) => 
            `${error.code}: ${error.message}`
          ).join(', ')
          
          console.log('📋 FedX エラー詳細:')
          errorData.errors.forEach((error: any, index: number) => {
            console.log(`  Error ${index + 1}:`, {
              code: error.code,
              message: error.message,
              details: error.details
            })
          })
        }
      } catch (parseError) {
        console.log('⚠️ FedX レスポンス解析エラー:', parseError)
        errorMessage = `HTTP ${response.status}: ${responseText}`
      }
      
      throw new Error(errorMessage)
    }

    const shipResult = JSON.parse(responseText)
    console.log('✅ FedX送り状作成完了')
    return shipResult

  } catch (error) {
    console.error('FedX Ship APIエラー:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  let paymentId: string | null = null
  let shipmentId: string | null = null

  try {
    const data: ShipmentRequest = await request.json()
    
    console.log('🚀 === Step 1: リクエストの受付とデータ準備 ===')
    console.log('送り状作成処理を開始:', { 
      sourceId: data.sourceId, 
      finalCharge: data.finalCharge,
      isExport: data.shipperInfo.countryCode === 'JP' && data.recipientInfo.countryCode !== 'JP'
    })

    // Step 1: 入力データのバリデーション
    if (!data.sourceId || !data.finalCharge || !data.shipperInfo || !data.recipientInfo) {
      return NextResponse.json(
        { 
          error: '必須データが不足しています',
          step: 'validation',
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

    // 環境変数の確認
    const requiredEnvVars = [
      'SQUARE_ACCESS_TOKEN',
      'SQUARE_APPLICATION_ID',
      'FEDEX_API_KEY',
      'FEDEX_SECRET_KEY',
      'FEDEX_EXPORT_ACCOUNT_NUMBER',
      'FEDEX_IMPORT_ACCOUNT_NUMBER',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    if (missingEnvVars.length > 0) {
      console.error('Missing environment variables:', missingEnvVars)
      return NextResponse.json(
        { 
          error: '必要な環境変数が設定されていません',
          step: 'env_check',
          missingVars: missingEnvVars
        },
        { status: 500 }
      )
    }

    // Square環境変数の詳細チェック
    console.log('🔍 Square環境変数チェック:')
    console.log(`  SQUARE_APPLICATION_ID: ${process.env.SQUARE_APPLICATION_ID ? '設定済み' : '未設定'}`)
    console.log(`  SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN ? '設定済み' : '未設定'}`)
    console.log(`  NEXT_PUBLIC_SQUARE_APPLICATION_ID: ${process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ? '設定済み' : '未設定'}`)
    console.log(`  NEXT_PUBLIC_SQUARE_LOCATION_ID: ${process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ? '設定済み' : '未設定'}`)

    // ユーザー認証情報の取得（任意）
    const userId = await getUserFromRequest(request)
    console.log('👤 ユーザー認証:', userId ? '認証済み' : 'ゲストユーザー')

    // FedX認証とアクセストークン取得
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
          step: 'fedex_auth',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 500 }
      )
    }

    console.log('🚀 === Step 2: FedXによる事前検証 (Validate Shipment) ===')
    
    // Step 2: FedX Validate Shipment API呼び出し
    try {
      await validateFedExShipment(fedexAccessToken, data)
      console.log('✅ FedX事前検証完了 - 入力データに問題なし')
    } catch (error) {
      console.error('❌ FedX事前検証でエラー:', error)
      
      // より詳細なエラー情報を提供
      let errorDetails = '不明なエラー'
      if (error instanceof Error) {
        errorDetails = error.message
      }
      
      return NextResponse.json(
        {
          error: 'FedX事前検証でエラーが発生しました',
          step: 'fedex_validation',
          details: errorDetails,
          debugInfo: {
            errorType: error?.constructor?.name || 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        },
        { status: 400 }
      )
    }

    console.log('🚀 === Step 3: Squareによる決済処理 ===')
    
    // Step 3: Square決済の実行
    try {
    console.log('💳 Square決済の実行中...')
    const idempotencyKey = randomUUID()
    
      console.log('📋 Square決済リクエスト詳細:')
      console.log(`  sourceId: ${data.sourceId}`)
      console.log(`  amount: ${data.finalCharge}`)
      console.log(`  idempotencyKey: ${idempotencyKey}`)
      
      // Sandbox環境での特別処理
      let sourceId = data.sourceId
      if (process.env.NODE_ENV !== 'production') {
        // 受信したsourceIdがSandboxの形式かチェック
        if (!sourceId.startsWith('cnon:card-nonce-ok') && 
            !sourceId.startsWith('cnon:') &&
            !sourceId.startsWith('ccof:') &&
            !sourceId.startsWith('bnon:')) {
          console.log('⚠️ Sandbox環境: 実際のクレジットカードトークンを検出')
          console.log(`  Original sourceId: ${sourceId}`)
          
          // Sandbox用テストトークンに置き換え
          sourceId = 'cnon:card-nonce-ok'
          console.log(`  ✅ Sandbox用テストトークンに置き換え: ${sourceId}`)
        } else {
          console.log(`  ✅ Sandbox用トークンを確認: ${sourceId}`)
        }
      }
      
      const squareClient = getSquareClient()
      
      console.log('💳 Square決済実行中...')
      const paymentResponse = await squareClient.payments.create({
        sourceId: sourceId,
        idempotencyKey: idempotencyKey,
        amountMoney: {
          amount: BigInt(data.finalCharge),
          currency: 'JPY'
        }
      })
      
      if (!paymentResponse.payment?.id) {
        throw new Error('決済レスポンスが無効です')
      }

      if (paymentResponse.payment.status !== 'COMPLETED') {
        throw new Error(`決済が完了していません。ステータス: ${paymentResponse.payment.status}`)
      }

      paymentId = paymentResponse.payment.id
      console.log('✅ Square決済実行完了:', paymentId)

    } catch (error) {
      console.error('❌ Square決済エラー:', error)
      if (error instanceof SquareError) {
        const errorMessage = error.errors?.[0]?.detail || 'Square決済でエラーが発生しました'
        return NextResponse.json(
          { 
            error: '決済処理に失敗しました',
            step: 'payment',
            details: errorMessage
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { 
          error: '決済処理で予期しないエラーが発生しました',
          step: 'payment',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 500 }
      )
    }

    console.log('🚀 === Step 4: 取引記録の初期保存 ===')
    
    // Step 4: 取引記録をDBに初期保存（tracking_number、label_urlはnull）
    try {
      console.log('💾 取引記録をDBに初期保存中...')
      
      const shipmentRecord = {
        // id: randomUUID(), // データベース側の自動生成に任せる
        user_id: userId,
        payment_id: paymentId,
        status: 'payment_completed',
        total_amount: data.finalCharge,
        currency: 'JPY',
        
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
        packages: data.packages,
        items: data.items,
        contents: data.contents,
        shipping_purpose: data.shippingPurpose,
        
        // 追跡番号とラベルURLは後で更新
        tracking_number: null,
        label_url: null
        
        // created_at, updated_at: データベース側のDEFAULT値に任せる
      }

      const { data: insertedRecord, error: insertError } = await supabase
        .from('shipments')
        .insert(shipmentRecord)
        .select('id')
        .single()

      if (insertError) {
        console.error('DB挿入エラー:', insertError)
        throw new Error(`DB挿入に失敗しました: ${insertError.message}`)
      }

      shipmentId = insertedRecord.id
      console.log('✅ 取引記録初期保存完了:', shipmentId)

    } catch (error) {
      console.error('❌ DB初期保存エラー:', error)
      // 決済は完了しているため、エラーでも記録を残す
      console.log('⚠️ 決済完了済み - 管理者による手動処理が必要')
      return NextResponse.json(
        { 
          error: '取引記録の保存に失敗しました',
          step: 'database_initial_save',
          paymentId: paymentId, // 決済IDは返す
          details: error instanceof Error ? error.message : '不明なエラー',
          action: '決済は完了しています。管理者にお問い合わせください。'
        },
        { status: 500 }
      )
    }

    console.log('🚀 === Step 5: FedXによる送り状の本発行 ===')
    
    // Step 5: FedX Ship APIで送り状を本発行
    let trackingNumber: string | null = null
    let labelUrl: string | null = null
    
    try {
      const fedexResult = await createFedExShipment(fedexAccessToken, data)
      
      // 追跡番号とラベルURL抽出
      trackingNumber = fedexResult.output?.transactionShipments?.[0]?.masterTrackingNumber
      labelUrl = fedexResult.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.url

      if (!trackingNumber) {
        throw new Error('FedXから追跡番号を取得できませんでした')
      }

      console.log('📋 追跡番号:', trackingNumber)
      console.log('🏷️ ラベルURL:', labelUrl)

    } catch (error) {
      console.error('❌ FedX送り状作成エラー:', error)
      // 決済・DB記録は完了しているため、手動処理が必要
      console.log('⚠️ 決済・DB記録完了済み - 管理者による手動処理が必要')
      return NextResponse.json(
        {
          error: 'FedX送り状作成に失敗しました',
          step: 'fedex_shipment_creation',
          paymentId: paymentId,
          shipmentId: shipmentId,
          details: error instanceof Error ? error.message : '不明なエラー',
          action: '決済と取引記録は完了しています。管理者が手動で送り状を作成します。'
        },
        { status: 500 }
      )
    }

    console.log('🚀 === Step 6: 取引記録の最終更新とレスポンス ===')
    
    // Step 6: 取引記録の最終更新
    try {
      console.log('💾 取引記録を最終更新中...')
      
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          tracking_number: trackingNumber,
          label_url: labelUrl,
          status: 'shipment_created',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)

      if (updateError) {
        console.error('DB更新エラー:', updateError)
        throw new Error(`DB更新に失敗しました: ${updateError.message}`)
      }

      console.log('✅ 取引記録最終更新完了')

    } catch (error) {
      console.error('❌ DB最終更新エラー:', error)
      // 送り状は作成済みなので、追跡番号等を返す
      console.log('⚠️ 送り状作成完了済み - 部分的成功')
      return NextResponse.json(
        {
      success: true,
      trackingNumber: trackingNumber,
          paymentId: paymentId,
          shipmentId: shipmentId,
      labelUrl: labelUrl,
          warning: 'DB更新でエラーが発生しましたが、送り状作成は完了しています',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 200 }
      )
    }

    // 全工程完了 - 成功レスポンス
    console.log('🎉 === 全ステップ完了 - 処理成功 ===')
    
    return NextResponse.json(
      {
        success: true,
        trackingNumber: trackingNumber,
      paymentId: paymentId,
      shipmentId: shipmentId,
        labelUrl: labelUrl,
        message: '送り状作成と決済が正常に完了しました'
      },
      { status: 200 }
    )

  } catch (error) {
    // 予期しないエラーの場合
    console.error('❌ 予期しないエラー:', error)
    
    return NextResponse.json(
      { 
        error: '予期しないエラーが発生しました',
        step: 'unexpected_error',
        paymentId: paymentId,
        shipmentId: shipmentId,
        details: error instanceof Error ? error.message : '不明なエラー',
        action: paymentId ? '決済が完了している可能性があります。管理者にお問い合わせください。' : undefined
      },
      { status: 500 }
    )
  }
} 