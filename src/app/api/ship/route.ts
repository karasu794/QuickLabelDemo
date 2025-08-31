import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireOrg } from '@/lib/org'
import { checkRate } from '@/lib/ratelimit'
import { SquareClient, SquareEnvironment, SquareError } from 'square'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { validateShipmentRequest, formatShipmentValidationErrors, validateShipmentBusinessRules, type ValidatedShipmentRequest } from '@/lib/validators/ship'

// Square clientの初期化（動的）
function getSquareClient() {
  console.log('🔧 Square SDK設定:')
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`  SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN ? '設定済み' : '未設定'}`)
  console.log(`  SQUARE_LOCATION_ID: ${process.env.SQUARE_LOCATION_ID ? '設定済み' : '未設定'}`)
  
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

        // 申告価額を設定（JPYからUSDに変換）
        const JPY_TO_USD_RATE = 0.0067;
        const declaredValueJPY = Number(pkg.declaredValue) || 1000; // デフォルト1000円
        const declaredValueUSD = Math.max(declaredValueJPY * JPY_TO_USD_RATE, 1.00);
        
        packageItem.declaredValue = {
          amount: parseFloat(declaredValueUSD.toFixed(2)),
          currency: 'USD'
        };
        
        console.log(`💰 申告価額: ${declaredValueJPY}円 → $${declaredValueUSD.toFixed(2)}`);
        
        return packageItem;
      }),
    },
    accountNumber: {
      value: accountNumber,
    },
  }

  // 国際配送の場合は税関情報を追加
  if (isExport || isImport) {
    // JPYからUSDへの変換関数（固定レート）
    const convertJPYtoUSD = (amountJPY: number): number => {
      const JPY_TO_USD_RATE = 0.0067; // 最新のレートに適宜更新してください
      const convertedAmount = amountJPY * JPY_TO_USD_RATE;
      // FedXの最小金額制限を考慮（$1.00未満の場合は$1.00とする）
      return Math.max(convertedAmount, 1.00);
    };

    const commoditiesData = data.items;
    
    // 総申告価額を計算（各商品の変換後USD金額の合計）
    const totalCustomsAmountUSD = commoditiesData.reduce((sum, item) => {
      const itemValueJPY = item.unitPrice * item.quantity;
      return sum + convertJPYtoUSD(itemValueJPY);
    }, 0);

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
          unitPrice: {
            amount: parseFloat(unitPriceUSD.toFixed(2)),
            currency: 'USD', // 通貨をUSDに指定
          },
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
  // Rate limit (per user if available, otherwise per IP)
  let userId: string | null = null
  try {
    const org = await requireOrg()
    userId = org.userId
  } catch {
    userId = null
  }
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const key = userId ? `user:${userId}` : `ip:${ip}`
  const rate = await checkRate(key)
  if (!rate.success) {
    return NextResponse.json({ code: 'RATE_LIMIT', message: 'Too many requests' }, { status: 429 })
  }
  let paymentId: string | null = null;
  let shipmentId: string | null = null;

  try {
    // 🛡️ リクエストボディの取得とバリデーション
    let rawBody;
    try {
      rawBody = await request.json();
    } catch (parseError) {
      console.error('🚫 JSON解析エラー:', parseError);
      return NextResponse.json({
        error: '無効なリクエスト形式です',
        details: 'JSONの形式が正しくありません',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Zodによる厳格なバリデーション
    const validationResult = validateShipmentRequest(rawBody);
    if (!validationResult.success) {
      console.error('🚫 バリデーションエラー:', validationResult.error.format());
      const formattedErrors = formatShipmentValidationErrors(validationResult.error.format());
      return NextResponse.json({
        error: '入力データが不正です',
        details: 'リクエストデータの形式または内容に問題があります',
        validationErrors: formattedErrors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // ビジネスルール追加バリデーション
    const businessRuleErrors = validateShipmentBusinessRules(validationResult.data);
    if (businessRuleErrors.length > 0) {
      console.error('🚫 ビジネスルールエラー:', businessRuleErrors);
      return NextResponse.json({
        error: 'ビジネスルールに違反しています',
        details: businessRuleErrors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // ✅ バリデーション成功
    const data: ValidatedShipmentRequest = validationResult.data;

    console.log('🚀 === Step 1: リクエスト受信とHSコード検証 ===');
    console.log('リクエストボディ:', {
      shipperCountry: data.shipperInfo.countryCode,
      recipientCountry: data.recipientInfo.countryCode,
      packageCount: data.packages.length,
      itemCount: data.items.length,
    });

    // HSコードの必須チェック (国際配送の場合)
    const isExport = data.shipperInfo.countryCode === 'JP' && data.recipientInfo.countryCode !== 'JP';
    const isImport = data.shipperInfo.countryCode !== 'JP' && data.recipientInfo.countryCode === 'JP';

    if (isExport || isImport) {
      const itemsMissingHSCode = data.items.filter(item => !item.hsCode || item.hsCode.trim() === '');
      if (itemsMissingHSCode.length > 0) {
        const missingItemsDesc = itemsMissingHSCode.map(item => `"${item.description}"`).join(', ');
        const errorMessage = `HSコードはすべての内容品に必須です。次の商品でHSコードが指定されていません: ${missingItemsDesc}`;
        console.error(`❌ HSコード検証エラー: ${errorMessage}`);
        return NextResponse.json(
          { 
            error: errorMessage,
            step: 'validation',
          },
          { status: 400 }
        );
      }
      console.log('✅ HSコード検証完了');
    }

    // ユーザー認証情報の取得（任意）
    // ★★★ この部分はDB保存直前に移動するため、ここでは不要 ★★★
    // const user = await getUserFromRequest(request);
    // console.log('👤 ユーザー認証:', user ? '認証済み' : 'ゲストユーザー');

    // 🚨 基幹仕様: FedX認証とアクセストークン取得（動的認証）
    console.log('🔐 FedX認証中...');
    let fedexAccessToken: string;
    try {
      fedexAccessToken = await getFedExAccessToken(data.shipperInfo.countryCode);
      console.log('✅ FedX認証完了');
    } catch (error) {
      console.error('FedX認証エラー:', error);
      return NextResponse.json(
        { 
          error: 'FedX認証に失敗しました',
          step: 'fedex_auth',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 500 }
      );
    }

    console.log('🚀 === Step 2: FedXによる事前検証 (Validate Shipment) ===');
    
    // Step 2: FedX Validate Shipment API呼び出し
    try {
      await validateFedExShipment(fedexAccessToken, data);
    } catch (error) {
      console.error('❌ FedX事前検証でエラー:', error);
      return NextResponse.json(
        { 
          error: 'FedX事前検証でエラーが発生しました',
          step: 'fedex_validation',
          details: error instanceof Error ? error.message : '不明なエラー'
        },
        { status: 400 }
      );
    }

    console.log('🚀 === Step 3: Squareによる決済処理 ===');
    
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
      
      // 🏠 Location IDの確認と設定
      const locationId = process.env.SQUARE_LOCATION_ID;
      if (!locationId) {
        throw new Error('SQUARE_LOCATION_ID環境変数が設定されていません');
      }
      console.log(`  🏠 Location ID: ${locationId}`);
      
      console.log('💳 Square決済実行中...')
      const paymentResponse = await squareClient.payments.create({
        sourceId: sourceId,
        idempotencyKey: idempotencyKey,
        locationId: locationId, // 🔧 Location IDを追加
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

    console.log('🚀 === Step 4: 取引記録の初期保存 ===');
    
    // Step 4: 取引記録をDBに初期保存（tracking_number、label_urlはnull）
    try {
      console.log('💾 取引記録をDBに初期保存中...');
      
      const user = await getUserFromRequest(request);
      console.log('👤 ユーザー認証:', user ? `認証済み (${user})` : 'ゲストユーザー');
      
      const shipmentRecord = {
        user_id: user, // ゲストの場合はnullになる
        payment_id: paymentId,
        status: 'payment_completed',
        
        // 🔧 荷送人情報（個別カラム）
        shipper_company: data.shipperInfo.companyName || '',
        shipper_contact: data.shipperInfo.contactName || '',
        shipper_phone: data.shipperInfo.phoneNumber || '',
        shipper_city: data.shipperInfo.cityName || '',
        shipper_country: data.shipperInfo.countryCode || '',
        shipper_postal_code: data.shipperInfo.postalCode || '',
        shipper_address1: data.shipperInfo.address1 || '',
        shipper_address2: data.shipperInfo.address2 || '',
        shipper_state: data.shipperInfo.stateCode || '',
        
        // 🔧 荷受人情報（個別カラム）
        recipient_company: data.recipientInfo.companyName || '',
        recipient_contact: data.recipientInfo.contactName || '',
        recipient_phone: data.recipientInfo.phoneNumber || '',
        recipient_city: data.recipientInfo.cityName || '',
        recipient_country: data.recipientInfo.countryCode || '',
        recipient_email: data.recipientInfo.email || '',
        recipient_postal_code: data.recipientInfo.postalCode || '',
        recipient_address1: data.recipientInfo.address1 || '',
        recipient_address2: data.recipientInfo.address2 || '',
        recipient_state: data.recipientInfo.stateCode || '',
        
        packages: data.packages,
        items: data.items,
        shipping_purpose: data.shippingPurpose,
        total_amount: data.finalCharge,
      };

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

    console.log('🚀 === Step 5: FedXによる送り状の本発行 ===');
    
    // Step 5: FedX Ship APIで送り状を本発行
    let trackingNumber: string | null = null;
    let labelUrl: string | null = null;
    
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

    console.log('🚀 === Step 6: 取引記録の最終更新とレスポンス ===');
    
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