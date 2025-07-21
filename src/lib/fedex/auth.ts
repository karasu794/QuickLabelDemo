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
export async function getFedExAccessToken(): Promise<string> {
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
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://apis.fedex.com'
    : 'https://apis-sandbox.fedex.com'

  const url = `${baseUrl}${endpoint}`

  try {
    console.log(`🌐 FedEx API ${method} ${endpoint}`)
    
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
    
    if (!response.ok) {
      console.error(`❌ FedEx API Error ${response.status}:`, responseText)
      
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

    const data = JSON.parse(responseText)
    console.log('✅ FedEx APIレスポンス成功')
    return data

  } catch (error) {
    console.error('❌ FedEx APIリクエストエラー:', error)
    throw error
  }
}

/**
 * 環境変数からFedEx認証情報を取得
 */
export function getFedExCredentials(): FedExCredentials {
  const requiredEnvVars = [
    'FEDEX_API_KEY',
    'FEDEX_SECRET_KEY',
    'FEDEX_ACCOUNT_NUMBER'
  ]

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  if (missingVars.length > 0) {
    throw new Error(`Missing FedEx environment variables: ${missingVars.join(', ')}`)
  }

  return {
    apiKey: process.env.FEDEX_API_KEY!,
    secretKey: process.env.FEDEX_SECRET_KEY!,
    accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!,
    exportAccountNumber: process.env.FEDEX_EXPORT_ACCOUNT_NUMBER,
    importAccountNumber: process.env.FEDEX_IMPORT_ACCOUNT_NUMBER,
  }
}

/**
 * 適切なアカウント番号を選択（輸出入判定）
 */
export function selectAccountNumber(
  credentials: FedExCredentials,
  originCountry: string,
  destinationCountry: string
): string {
  const isExport = originCountry === 'JP' && destinationCountry !== 'JP'
  const isImport = originCountry !== 'JP' && destinationCountry === 'JP'
  
  if (isExport && credentials.exportAccountNumber) {
    console.log('🌏 輸出用アカウント使用')
    return credentials.exportAccountNumber
  }
  
  if (isImport && credentials.importAccountNumber) {
    console.log('🏠 輸入用アカウント使用')
    return credentials.importAccountNumber
  }
  
  console.log('🏘️ 標準アカウント使用')
  return credentials.accountNumber
} 

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
 * FedX Rate APIを使用して料金見積もりを取得
 */
export async function getFedExRates(rateInfo: RateRequestInfo): Promise<FedExRateQuote[]> {
  const accessToken = await getFedExAccessToken()
  
  // アカウント番号を決定（輸出入判定）
  const isExport = rateInfo.shipperCountryCode !== rateInfo.recipientCountryCode
  const accountNumber = isExport 
    ? process.env.FEDEX_EXPORT_ACCOUNT_NUMBER || process.env.FEDEX_ACCOUNT_NUMBER
    : process.env.FEDEX_ACCOUNT_NUMBER

  if (!accountNumber) {
    throw new Error('FedXアカウント番号が設定されていません')
  }

  // Rate APIリクエストボディを構築
  const requestBody = {
    accountNumber: {
      value: accountNumber
    },
    requestedShipment: {
      shipper: {
        address: {
          postalCode: rateInfo.shipperPostalCode,
          countryCode: rateInfo.shipperCountryCode,
          ...(rateInfo.shipperStateCode && { stateOrProvinceCode: rateInfo.shipperStateCode }),
          city: rateInfo.shipperCityName
        }
      },
      recipient: {
        address: {
          postalCode: rateInfo.recipientPostalCode,
          countryCode: rateInfo.recipientCountryCode,
          ...(rateInfo.recipientStateCode && { stateOrProvinceCode: rateInfo.recipientStateCode }),
          city: rateInfo.recipientCityName,
          residential: rateInfo.isResidential
        }
      },
      shipDatestamp: rateInfo.shipDate,
      rateRequestType: ["ACCOUNT", "LIST"],
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