/**
 * FedEx API認証とAPIクライアント共通ライブラリ
 * Ship API, Open Ship API, Rate APIで共通利用
 */

export interface FedExCredentials {
  apiKey: string
  secretKey: string
  accountNumber: string
  exportAccountNumber?: string
  importAccountNumber?: string
}

export interface FedExApiResponse<T = any> {
  output?: T
  errors?: Array<{
    code: string
    message: string
    details?: any
  }>
}

/**
 * FedEx OAuth 2.0認証トークン取得
 */
/**
 * FedEx API ベースURLを取得
 */
export function getFedExApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_FEDEX_API_BASE_URL || 'https://apis.fedex.com'
}

/**
 * 🚨 基幹仕様: 輸出入に応じた動的認証トークン取得
 * @param originCountry 出荷地国コード（必須）
 */
export async function getFedExAccessToken(originCountry: string): Promise<string> {
  const baseUrl = getFedExApiBaseUrl()
  const authUrl = `${baseUrl}/oauth/token`
  
  // 基幹仕様に従って認証情報を動的選択
  const credentials = getFedExCredentialsByOrigin(originCountry)

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.apiKey,
        client_secret: credentials.secretKey,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('FedEx認証エラー:', errorText)
      throw new Error(`FedEx認証に失敗しました: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.access_token) {
      throw new Error('FedExアクセストークンが取得できませんでした')
    }

    console.log('✅ FedEx認証トークン取得成功')
    return data.access_token
  } catch (error) {
    console.error('❌ FedEx認証処理エラー:', error)
    throw new Error('FedEx認証処理に失敗しました')
  }
}

/**
 * FedEx API共通リクエスト関数
 */
export async function fedexApiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  accessToken: string,
  body?: any
): Promise<FedExApiResponse<T>> {
  const baseUrl = getFedExApiBaseUrl()

  const url = `${baseUrl}${endpoint}`

  try {
    console.log(`🌐 FedEx API ${method} ${endpoint}`)
    
    // ===== デバッグ用: リクエストペイロードの詳細ログ =====
    console.log('--- FedEx API Request Payload ---');
    console.log('🔗 URL:', url);
    console.log('📋 Method:', method);
    console.log('🔑 Headers:', {
      'Authorization': `Bearer ${accessToken.substring(0, 20)}...`, // トークンの一部のみ表示
      'Content-Type': 'application/json',
      'X-locale': 'ja_JP',
    });
    if (body) {
      console.log('📦 Request Body:');
      console.log(JSON.stringify(body, null, 2));
    } else {
      console.log('📦 Request Body: (none)');
    }
    console.log('--- End of Request Payload ---');
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'ja_JP',
      },
      ...(body && { body: JSON.stringify(body) }),
    })

    const responseText = await response.text()
    
    // ===== デバッグ用: レスポンスの詳細ログ =====
    console.log('--- FedEx API Response Details ---');
    console.log('📊 Status Code:', response.status);
    console.log('📋 Status Text:', response.statusText);
    console.log('🔧 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error(`❌ FedEx API Error ${response.status}:`, responseText)
      console.log('🔍 503エラーの場合の詳細チェック:');
      if (response.status === 503) {
        console.log('  - Service Unavailable detected');
        console.log('  - Possible causes: Rate limiting, server overload, maintenance');
        console.log('  - Retry-After header:', response.headers.get('Retry-After'));
        console.log('  - X-RateLimit headers:');
        // TypeScript downlevelIteration対応: Array.from()を使用
        const headersArray = Array.from(response.headers.entries());
        headersArray.forEach(([key, value]) => {
          if (key.toLowerCase().includes('ratelimit') || key.toLowerCase().includes('limit')) {
            console.log(`    ${key}: ${value}`);
          }
        });
      }
      console.log('--- End of Error Response ---');
      
      try {
        const errorData = JSON.parse(responseText)
        return {
          errors: errorData.errors || [{ 
            code: response.status.toString(), 
            message: responseText 
          }]
        }
      } catch {
        return {
          errors: [{ 
            code: response.status.toString(), 
            message: responseText 
          }]
        }
      }
    }

    console.log('📄 Response Body Length:', responseText.length);
    console.log('--- End of Response Details ---');
    
    const data = JSON.parse(responseText)
    console.log('✅ FedEx APIレスポンス成功')
    return data

  } catch (error) {
    console.error('❌ FedEx APIリクエストエラー:', error)
    throw error
  }
}

/**
 * 🚨 基幹仕様: 輸出入に応じた認証情報を動的に選択
 * @param originCountry 出荷地国コード
 */
export function getFedExCredentialsByOrigin(originCountry: string): { apiKey: string; secretKey: string; accountNumber: string } {
  const isExport = originCountry === 'JP'
  
  if (isExport) {
    // 輸出の場合: 日本からの発送
    console.log('🌏 輸出用認証情報を使用 (originCountry: JP)')
    return {
      apiKey: process.env.FEDEX_EXPORT_API_KEY!,
      secretKey: process.env.FEDEX_EXPORT_SECRET_KEY!,
      accountNumber: process.env.FEDEX_EXPORT_ACCOUNT_NUMBER!
    }
  } else {
    // 輸入の場合: 日本以外からの発送
    console.log(`🏠 輸入用認証情報を使用 (originCountry: ${originCountry})`)
    return {
      apiKey: process.env.FEDEX_IMPORT_API_KEY!,
      secretKey: process.env.FEDEX_IMPORT_SECRET_KEY!,
      accountNumber: process.env.FEDEX_IMPORT_ACCOUNT_NUMBER!
    }
  }
}

// 🚨 基幹仕様: レガシー関数完全削除完了
// 以下の関数は汎用変数を使用するため削除されました:
// - getFedExCredentials() 
// - selectAccountNumber()
// 
// 代替として getFedExCredentialsByOrigin(originCountry) を使用してください 

/**
 * FedX Rate API - 複数パッケージ対応料金見積もり
 */
export interface RateRequestPackage {
  weight: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  packaging?: string
  declaredValue?: number
}

export interface RateRequestInfo {
  shipperCountryCode: string
  shipperPostalCode: string
  shipperStateCode?: string
  shipperCityName: string
  recipientCountryCode: string
  recipientPostalCode: string
  recipientStateCode?: string
  recipientCityName: string
  shipDate: string
  isResidential: boolean
  packages: RateRequestPackage[]
}

export interface FedExRateQuote {
  serviceType: string
  serviceName: string
  amount: number
  currency: string
  deliveryDate?: string
  deliveryDayOfWeek?: string
  transitTime?: string
}

/**
 * 🚨 基幹仕様: FedX Rate APIを使用して料金見積もりを取得（動的アカウント切り替え対応）
 */
export async function getFedExRates(rateInfo: RateRequestInfo): Promise<FedExRateQuote[]> {
  // 基幹仕様に従って認証情報とアカウント番号を動的選択
  const credentials = getFedExCredentialsByOrigin(rateInfo.shipperCountryCode)
  const accessToken = await getFedExAccessToken(rateInfo.shipperCountryCode)

  if (!credentials.accountNumber) {
    throw new Error('FedXアカウント番号が設定されていません')
  }

  // Rate APIリクエストボディを構築
  const requestBody = {
    accountNumber: {
      value: credentials.accountNumber
    },
    requestedShipment: {
      shipper: {
        address: {
          postalCode: rateInfo.shipperPostalCode,
          countryCode: rateInfo.shipperCountryCode,
          ...(rateInfo.shipperStateCode && ['US', 'CA'].includes(rateInfo.shipperCountryCode) && { stateOrProvinceCode: rateInfo.shipperStateCode }),
          city: rateInfo.shipperCityName
        }
      },
      recipient: {
        address: {
          postalCode: rateInfo.recipientPostalCode,
          countryCode: rateInfo.recipientCountryCode,
          ...(rateInfo.recipientStateCode && ['US', 'CA'].includes(rateInfo.recipientCountryCode) && { stateOrProvinceCode: rateInfo.recipientStateCode }),
          city: rateInfo.recipientCityName,
          residential: rateInfo.isResidential
        }
      },
      shipDatestamp: rateInfo.shipDate,
      rateRequestType: ["ACCOUNT", "LIST"],
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      // ACCOUNT.NUMBER.MISMATCHエラー対策: 送料支払人情報を追加
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: {
              value: credentials.accountNumber
            }
          }
        }
      },
      requestedPackageLineItems: rateInfo.packages.map((pkg, index) => ({
        sequenceNumber: index + 1,
        groupPackageCount: 1,
        weight: {
          units: "KG",
          value: pkg.weight
        },
        ...(pkg.dimensions && {
          dimensions: {
            length: pkg.dimensions.length,
            width: pkg.dimensions.width,
            height: pkg.dimensions.height,
            units: "CM"
          }
        }),
        ...(pkg.declaredValue && {
          declaredValue: {
            amount: pkg.declaredValue,
            currency: "JPY"
          }
        })
      }))
    }
  }

  // 監査ログ: リクエストに乗っている主要フラグと値（1回だけ）
  try {
    const once = (getFedExRates as any).__auditLogged === true
    if (!once) {
      console.debug('[rates][request]', {
        residential: !!requestBody?.requestedShipment?.recipient?.address?.residential,
        declaredEnabled: Array.isArray(requestBody?.requestedShipment?.requestedPackageLineItems)
          && requestBody.requestedShipment.requestedPackageLineItems.some((p: any) => !!p?.declaredValue),
        declaredValue: requestBody?.requestedShipment?.requestedPackageLineItems?.map((p: any) => p?.declaredValue)?.filter(Boolean) || [],
        rateRequestType: requestBody?.requestedShipment?.rateRequestType,
      })
      ;(getFedExRates as any).__auditLogged = true
    }
  } catch {}

  // === AUDIT POINT 3: Before Request (リクエスト送信前の記録) ===
  const DEBUG_RATE_AUDIT = String(process.env.DEBUG_RATE_AUDIT || '').toLowerCase() === 'true' || process.env.DEBUG_RATE_AUDIT === '1'
  const auditRequestOnce = (getFedExRates as any).__auditRequestOnce === true
  
  if (DEBUG_RATE_AUDIT && !auditRequestOnce && process.env.NODE_ENV !== 'production') {
    try {
      const audit = {
        timestamp: new Date().toISOString(),
        auditPoint: 'before_request',
        requestInfo: {
          shipper: {
            countryCode: rateInfo.shipperCountryCode,
            postalCode: rateInfo.shipperPostalCode,
            stateCode: rateInfo.shipperStateCode || null,
            cityName: rateInfo.shipperCityName,
          },
          recipient: {
            countryCode: rateInfo.recipientCountryCode,
            postalCode: rateInfo.recipientPostalCode,
            stateCode: rateInfo.recipientStateCode || null,
            cityName: rateInfo.recipientCityName,
            isResidential: rateInfo.isResidential,
          },
          shipDate: rateInfo.shipDate,
          packageCount: rateInfo.packages.length,
          packages: rateInfo.packages.map((pkg, idx) => ({
            sequenceNumber: idx + 1,
            weight: pkg.weight,
            hasDimensions: !!pkg.dimensions,
            dimensions: pkg.dimensions || null,
            declaredValue: pkg.declaredValue || null,
          })),
          rateRequestType: requestBody?.requestedShipment?.rateRequestType,
          accountNumber: credentials.accountNumber ? `${credentials.accountNumber.substring(0, 4)}****` : null,
        },
      }
      // eslint-disable-next-line no-console
      console.debug('[rate][audit][before_request]', audit)
      ;(getFedExRates as any).__auditRequestOnce = true
    } catch {}
  }

  console.log('📊 FedX Rate API リクエスト:', JSON.stringify(requestBody, null, 2))

  const response = await fedexApiRequest<any>(
    '/rate/v1/rates/quotes',
    'POST',
    accessToken,
    requestBody
  )

  if (response.errors && response.errors.length > 0) {
    const error = response.errors[0]
    throw new Error(`FedX Rate API エラー: ${error.code} - ${error.message}`)
  }

  if (!response.output?.rateReplyDetails) {
    throw new Error('FedX Rate API レスポンスが無効です')
  }

  // レスポンスを標準形式に変換
  const rates: FedExRateQuote[] = response.output.rateReplyDetails.map((rate: any) => {
    const amount = parseFloat(rate.ratedShipmentDetails?.[0]?.totalNetCharge?.amount || '0')
    const currency = rate.ratedShipmentDetails?.[0]?.totalNetCharge?.currency || 'JPY'
    
    return {
      serviceType: rate.serviceType,
      serviceName: getServiceDisplayName(rate.serviceType),
      amount,
      currency,
      deliveryDate: rate.operationalDetail?.deliveryDate,
      deliveryDayOfWeek: rate.operationalDetail?.deliveryDayOfWeek,
      transitTime: rate.operationalDetail?.transitTime
    }
  })

  console.log(`✅ FedX Rate API 成功: ${rates.length}件の料金を取得`)
  return rates
}

/**
 * サービスタイプの表示名を取得
 */
function getServiceDisplayName(serviceType: string): string {
  const serviceNames: Record<string, string> = {
    'FEDEX_INTERNATIONAL_PRIORITY': 'FedEx International Priority',
    'FEDEX_INTERNATIONAL_ECONOMY': 'FedEx International Economy',
    'FEDEX_GROUND': 'FedEx Ground',
    'FEDEX_EXPRESS_SAVER': 'FedEx Express Saver',
    'FEDEX_2_DAY': 'FedEx 2Day',
    'FEDEX_STANDARD_OVERNIGHT': 'FedEx Standard Overnight',
    'PRIORITY_OVERNIGHT': 'FedEx Priority Overnight'
  }
  
  return serviceNames[serviceType] || serviceType
} 