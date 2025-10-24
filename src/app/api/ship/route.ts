import { NextRequest, NextResponse } from 'next/server'
// NOTE: This legacy route is superseded by /api/ship/create for production single-package shipping.
// Please migrate callers to `POST /api/ship/create`.
import { headers } from 'next/headers'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import { checkRate } from '@/lib/ratelimit'
import { SquareClient, SquareEnvironment, SquareError } from 'square'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { validateShipmentRequest, formatShipmentValidationErrors, validateShipmentBusinessRules, type ValidatedShipmentRequest } from '@/lib/validators/ship'

function getSquareClient() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN!
  const config: any = { token: accessToken }
  config.environment = process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox
  return new SquareClient(config)
}

const supabase = createServiceRoleClient()

interface ShipmentRequest {
  sourceId: string
  finalCharge: number
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

// 🚨 基幹仕様: FedEx認証トークン取得（動的認証情報切り替え対応）
async function getFedExAccessToken(originCountry: string): Promise<string> {
  const authUrl = 'https://apis.fedex.com/oauth/token'
  
  // 基幹仕様に従って認証情報を動的選択
  const isExport = originCountry === 'JP'
  
  let apiKey: string, secretKey: string
  if (isExport) {
    // 輸出の場合: 日本からの発送
    apiKey = process.env.FEDEX_EXPORT_API_KEY!
    secretKey = process.env.FEDEX_EXPORT_SECRET_KEY!
    console.log('🌏 Ship API: 輸出用認証情報を使用してトークン取得')
  } else {
    // 輸入の場合: 日本以外からの発送
    apiKey = process.env.FEDEX_IMPORT_API_KEY!
    secretKey = process.env.FEDEX_IMPORT_SECRET_KEY!
    console.log(`🏠 Ship API: 輸入用認証情報を使用してトークン取得 (originCountry: ${originCountry})`)
  }

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: secretKey,
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
function buildBaseFedExShipmentRequest(data: ShipmentRequest, jpyToUsd: number) {
  // 輸出入判定（日本から海外への発送かどうか）
  const isExport = data.shipperInfo.countryCode === 'JP' && data.recipientInfo.countryCode !== 'JP'
  const isImport = data.shipperInfo.countryCode !== 'JP' && data.recipientInfo.countryCode === 'JP'
  
  console.log(`📊 発送タイプ判定: 
    出荷元: ${data.shipperInfo.countryCode}
    お届け先（国／地域）: ${data.recipientInfo.countryCode}
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

  // ★★★ 重量整合性修正: 内容品の重量合計を正として使用 ★★★
  // 1. 内容品の重量合計を算出する
  const totalCommodityWeight = data.items.reduce((sum, item) => sum + (item.weight || 0), 0)
  
  console.log('⚖️ 重量整合性チェック:')
  console.log(`  内容品の重量合計: ${totalCommodityWeight} KG`)
  console.log(`  荷物入力重量: ${data.packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight), 0)} KG`)
  console.log(`  → FedX送信重量: ${totalCommodityWeight} KG (内容品重量を採用)`)
  
  // 荷物の総重量として内容品の重量合計を使用
  const totalWeight = totalCommodityWeight

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

  // ★★★ 電話番号の正規化（数字以外を削除・15文字制限）★★★
  const sanitizedShipperPhone = data.shipperInfo.phoneNumber.replace(/\D/g, '').substring(0, 15);
  const sanitizedRecipientPhone = data.recipientInfo.phoneNumber.replace(/\D/g, '').substring(0, 15);
  
  console.log('📞 電話番号正規化:')
  console.log(`  荷送人: "${data.shipperInfo.phoneNumber}" → "${sanitizedShipperPhone}" (${sanitizedShipperPhone.length}文字)`)
  console.log(`  荷受人: "${data.recipientInfo.phoneNumber}" → "${sanitizedRecipientPhone}" (${sanitizedRecipientPhone.length}文字)`)

  // 基本的な送り状リクエスト構造
  const baseRequest = {
    requestedShipment: {
      shipper: {
        contact: {
          personName: data.shipperInfo.contactName,
          phoneNumber: sanitizedShipperPhone, // 修正後の変数を使用
          companyName: data.shipperInfo.companyName,
        },
        address: {
          streetLines: [
            data.shipperInfo.address1,
            data.shipperInfo.address2
          ].filter(Boolean),
          city: data.shipperInfo.cityName,
          ...(data.shipperInfo.stateCode && ['US', 'CA', 'PR'].includes(data.shipperInfo.countryCode) && { stateOrProvinceCode: data.shipperInfo.stateCode }),
          postalCode: data.shipperInfo.postalCode,
          countryCode: data.shipperInfo.countryCode,
        },
      },
      recipients: [
        {
          contact: {
            personName: data.recipientInfo.contactName,
            phoneNumber: sanitizedRecipientPhone, // 修正後の変数を使用
            emailAddress: data.recipientInfo.email,
            companyName: data.recipientInfo.companyName,
          },
          address: {
            streetLines: [
              data.recipientInfo.address1,
              data.recipientInfo.address2
            ].filter(Boolean),
            city: data.recipientInfo.cityName,
            ...(data.recipientInfo.stateCode && ['US', 'CA', 'PR'].includes(data.recipientInfo.countryCode) && { stateOrProvinceCode: data.recipientInfo.stateCode }),
            postalCode: data.recipientInfo.postalCode,
            countryCode: data.recipientInfo.countryCode,
            residential: data.recipientInfo.isResidential,
          },
        },
      ],
      shipDatestamp: new Date().toISOString().split('T')[0], // YYYY-MM-DD形式
      serviceType: serviceType,
      packagingType: (() => {
        const requestedType = data.packages[0]?.type;
        console.log(`📦 パッケージタイプ: ユーザー選択=${requestedType}, 総重量=${totalCommodityWeight}KG`);
        
        // ユーザーが選択したパッケージタイプを優先して使用
        if (requestedType && requestedType !== '') {
          console.log(`➡️ ユーザー選択タイプを使用: ${requestedType}`);
          return requestedType;
        }
        
        // フォールバック: 重量ベースでの判定
        if (totalCommodityWeight <= 0.5) {
          console.log('➡️ フォールバック: FEDEX_ENVELOPE選択（軽量）');
          return 'FEDEX_ENVELOPE';
        } else if (totalCommodityWeight <= 2.0) {
          console.log('➡️ フォールバック: FEDEX_PAK選択（中軽量）');
          return 'FEDEX_PAK';
        } else {
          console.log('➡️ フォールバック: FEDEX_BOX選択（重量）');
          return 'FEDEX_BOX';
        }
      })(),
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
      requestedPackageLineItems: data.packages.map((pkg, index) => {
        console.log(`📦 パッケージ${index + 1}処理: タイプ=${pkg.type}, 入力重量=${pkg.weight}KG`);
        
        // パッケージの重量を内容品重量合計に基づいて設定
        const packageWeight = data.packages.length === 1 
          ? totalCommodityWeight  // 単一パッケージの場合は総重量
          : parseFloat(pkg.weight) || (totalCommodityWeight / data.packages.length); // 複数パッケージの場合は分割
        
        console.log(`📦 パッケージ${index + 1}の最終重量: ${packageWeight}KG`);
        
        const packageItem: any = {
          sequenceNumber: index + 1,
          groupPackageCount: 1,
          weight: {
            units: 'KG',
            value: packageWeight,
          },
        };

        // YOUR_PACKAGINGの場合は寸法を追加
        if (pkg.type === 'YOUR_PACKAGING') {
          if (pkg.length && pkg.width && pkg.height) {
            packageItem.dimensions = {
              length: parseInt(pkg.length),
              width: parseInt(pkg.width),
              height: parseInt(pkg.height),
              units: 'CM',
            };
            console.log(`📏 カスタム寸法設定: ${pkg.length}×${pkg.width}×${pkg.height}cm`);
          } else {
            // デフォルト寸法を設定
            packageItem.dimensions = {
              length: 30,
              width: 20,
              height: 10,
              units: 'CM',
            };
            console.log(`📏 デフォルト寸法設定: 30×20×10cm`);
          }
        }

        // 申告価額を設定（為替サービスでUSD換算）
        const declaredValueJPY = Number(pkg.declaredValue) || 1000;
        const rate = Number.isFinite(jpyToUsd) && jpyToUsd > 0 ? jpyToUsd : (1/150)
        const declaredValueUSD = Math.max(declaredValueJPY * rate, 1.0)
        packageItem.declaredValue = { amount: parseFloat(declaredValueUSD.toFixed(2)), currency: 'USD' }
        console.log(`💰 申告価額: ${declaredValueJPY}円 → $${declaredValueUSD.toFixed(2)} (jpyToUsd:${rate})`)
        
        return packageItem;
      }),
    },
    accountNumber: {
      value: accountNumber,
    },
  }

  // 国際配送の場合は税関情報を追加
  if (isExport || isImport) {
    // JPY→USD換算関数（為替サービス利用）
    const convertJPYtoUSD = (amountJPY: number): number => Math.max(amountJPY * (jpyToUsd > 0 ? jpyToUsd : (1/150)), 1.0)

    const commoditiesData = data.items;
    
    // 総申告価額を計算（各商品の変換後USD金額の合計）
    // 事前に為替を1回取得
    const totalCustomsAmountUSD = commoditiesData.reduce((sum, item) => sum + convertJPYtoUSD(item.unitPrice * item.quantity), 0)

    ;(baseRequest as any).requestedShipment.customsClearanceDetail = {
      commercialInvoice: {
        purpose: 'SOLD',
      },
      dutiesPayment: {
        paymentType: 'RECIPIENT',
      },
      totalCustomsValue: {
        amount: parseFloat(totalCustomsAmountUSD.toFixed(2)),
        currency: 'USD', // 通貨をUSDに指定
      },
      commodities: commoditiesData.map(item => {
        const unitPriceUSD = convertJPYtoUSD(item.unitPrice);
        const customsValueUSD = convertJPYtoUSD(item.unitPrice * item.quantity);

        return {
          description: item.description,
          countryOfManufacture: item.countryOfManufacture,
          quantity: item.quantity,
          quantityUnits: 'PCS',
          unitPrice: { amount: parseFloat(unitPriceUSD.toFixed(2)), currency: 'USD' },
          customsValue: {
            amount: parseFloat(customsValueUSD.toFixed(2)),
            currency: 'USD', // 通貨をUSDに指定
          },
          weight: {
            units: 'KG',
            value: item.weight,
          },
          ...(item.hsCode && { harmonizedCode: item.hsCode }),
        };
      }),
    };
  }

  return baseRequest
}

// Step 2: FedX Validate Shipment APIを呼び出す
async function validateFedExShipment(accessToken: string, data: ShipmentRequest) {
  const validateUrl = 'https://apis.fedex.com/ship/v1/shipments/packages/validate'

  try {
    // 一度のみ為替取得
    let jpyToUsd = 1/150
    try {
      const { ExchangeRateService } = await import('@/lib/services/exchangeRateService')
      const usdToJpy = await ExchangeRateService.getExchangeRate()
      if (usdToJpy > 0) jpyToUsd = 1 / usdToJpy
    } catch {}
    const baseRequest = buildBaseFedExShipmentRequest(data, jpyToUsd)
    
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

    // デバッグ用：FedXに送信するリクエスト内容をコンソールに出力
    console.log('--- FedEx Validate Request Body ---');
    console.log(JSON.stringify(validateRequest, null, 2));

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
  const shipUrl = 'https://apis.fedex.com/ship/v1/shipments'

  try {
    let jpyToUsd = 1/150
    try {
      const { ExchangeRateService } = await import('@/lib/services/exchangeRateService')
      const usdToJpy = await ExchangeRateService.getExchangeRate()
      if (usdToJpy > 0) jpyToUsd = 1 / usdToJpy
    } catch {}
    const baseRequest = buildBaseFedExShipmentRequest(data, jpyToUsd)
    
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
    console.log('📍 リクエスト先URL:', shipUrl)
    console.log('🔍 リクエスト詳細検証:')
    console.log('  - 荷送人電話番号:', shipmentRequest.requestedShipment.shipper.contact.phoneNumber)
    console.log('  - 荷受人電話番号:', shipmentRequest.requestedShipment.recipients[0].contact.phoneNumber)
    console.log('  - パッケージ重量:', shipmentRequest.requestedShipment.requestedPackageLineItems[0].weight.value)
    console.log('  - 輸出判定:', data.shipperInfo.countryCode === 'JP' && data.recipientInfo.countryCode !== 'JP')
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
  // Keep rate-limit and validation, but remove sandbox sourceId replacement.
  let userId: string | null = null
  try { const { user } = await getUserOrThrow(); userId = user.id } catch { userId = null }
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const key = userId ? `user:${userId}` : `ip:${ip}`
  await checkRate(key) // SR-B: 常時PASSのため分岐不要

  let rawBody: any
  try { rawBody = await request.json() } catch { return NextResponse.json({ error: '無効なリクエスト形式です' }, { status: 400 }) }
  const validationResult = validateShipmentRequest(rawBody)
  if (!validationResult.success) {
    const formattedErrors = formatShipmentValidationErrors(validationResult.error.format())
    return NextResponse.json({ error: '入力データが不正です', validationErrors: formattedErrors }, { status: 400 })
  }

  // NOTE: This legacy route still attempts payment; sandbox token auto-replacement is disabled.
  try {
    const squareClient = getSquareClient()
    const idempotencyKey = randomUUID()
    const paymentResponse = await squareClient.payments.create({
      sourceId: rawBody.sourceId,
      idempotencyKey,
      locationId: process.env.SQUARE_LOCATION_ID!,
      amountMoney: { amount: BigInt(rawBody.finalCharge), currency: 'JPY' as const }
    })
    if (!paymentResponse.payment?.id || paymentResponse.payment.status !== 'COMPLETED') {
      return NextResponse.json({ error: '決済が完了していません' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: '決済処理に失敗しました' }, { status: 400 })
  }

  return NextResponse.json({ warning: 'Legacy ship route. Use /api/ship/create' }, { status: 200 })
} 