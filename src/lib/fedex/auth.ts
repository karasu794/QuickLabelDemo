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