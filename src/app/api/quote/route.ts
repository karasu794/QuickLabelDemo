import { NextRequest, NextResponse } from 'next/server'

// リクエストボディの型定義
interface ShippingQuoteRequest {
  // 荷送人情報
  sender: {
    postalCode?: string
    countryCode: string
    city?: string
  }
  // 荷受人情報
  recipient: {
    postalCode?: string
    countryCode: string
    city?: string
  }
  // 荷物情報
  package: {
    weight: number // kg単位
  }
}

// FedEx API レスポンスの型定義
interface FedExRateResponse {
  output: {
    rateReplyDetails: Array<{
      serviceName: string
      ratedShipmentDetails: Array<{
        totalNetCharge: number
        currency: string
      }>
    }>
  }
}

// レスポンスの型定義
interface ShippingQuoteResponse {
  success: boolean
  message: string
  rates?: Array<{
    serviceName: string
    amount: number
    currency: string
  }>
  error?: string
  timestamp: string
}

// FedExアクセストークンを取得する関数
async function getFedExAccessToken(): Promise<string> {
  const clientId = process.env.FEDEX_API_KEY
  const clientSecret = process.env.FEDEX_SECRET_KEY

  if (!clientId || !clientSecret) {
    throw new Error('FedExのAPIキーまたはシークレットキーが設定されていません')
  }

  const response = await fetch('https://apis-sandbox.fedex.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`FedEx認証API呼び出しエラー: ${response.status} ${response.statusText}`)
  }

  const tokenData = await response.json()
  return tokenData.access_token
}

// FedEx Rate APIのリクエストボディを構築する関数
function buildFedExRateRequest(request: ShippingQuoteRequest) {
  const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER

  if (!accountNumber) {
    throw new Error('FedExアカウント番号が設定されていません')
  }

  // shipper addressを構築（郵便番号がある場合のみ含める）
  const shipperAddress: any = {
    countryCode: request.sender.countryCode
  }
  if (request.sender.postalCode && request.sender.postalCode.trim() !== '') {
    shipperAddress.postalCode = request.sender.postalCode
  }
  // 都市名がある場合は追加
  if (request.sender.city && request.sender.city.trim() !== '') {
    shipperAddress.city = request.sender.city
  }

  // recipient addressを構築
  const recipientAddress: any = {
    countryCode: request.recipient.countryCode
  }
  
  // 郵便番号の処理
  if (request.recipient.postalCode && request.recipient.postalCode.trim() !== '') {
    // 郵便番号が存在する場合はそのまま使用
    recipientAddress.postalCode = request.recipient.postalCode
  } else if (request.recipient.city && request.recipient.city.trim() !== '') {
    // 郵便番号が存在しないが都市名がある場合（郵便番号不要国）はダミー値を設定
    recipientAddress.postalCode = '00000'
    console.log('郵便番号不要国のためダミー値"00000"を設定しました')
  }
  
  // 都市名がある場合は追加
  if (request.recipient.city && request.recipient.city.trim() !== '') {
    recipientAddress.city = request.recipient.city
  }

  return {
    accountNumber: {
      value: accountNumber
    },
    requestedShipment: {
      shipper: {
        address: shipperAddress
      },
      recipient: {
        address: recipientAddress
      },
      pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
      rateRequestType: ['ACCOUNT'],
      requestedPackageLineItems: [
        {
          weight: {
            units: 'KG',
            value: request.package.weight
          }
        }
      ]
    }
  }
}

// FedEx Rate APIを呼び出す関数
async function getFedExRates(accessToken: string, requestData: any): Promise<FedExRateResponse> {
  const response = await fetch('https://apis-sandbox.fedex.com/rate/v1/rates/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-locale': 'ja_JP'
    },
    body: JSON.stringify(requestData)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`FedEx Rate API呼び出しエラー: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return await response.json()
}

export async function POST(request: NextRequest) {
  console.log('APIが受け取ったリクエストボディ:', await request.clone().json());
  try {
    // リクエストボディの解析
    const body: ShippingQuoteRequest = await request.json()

    // バリデーション
    if (!body.sender?.countryCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: '荷送人の国コードが必要です',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    if (!body.recipient?.countryCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: '荷受人の国コードが必要です',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    if (!body.package?.weight || body.package.weight <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '荷物の重量が必要です（0より大きい値）',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    console.log('=== FedEx配送見積もりAPIが呼び出されました ===')
    console.log('荷送人情報:', {
      郵便番号: body.sender.postalCode || '未設定',
      都市名: body.sender.city || '未設定',
      国コード: body.sender.countryCode
    })
    console.log('荷受人情報:', {
      郵便番号: body.recipient.postalCode || '未設定',
      都市名: body.recipient.city || '未設定',
      国コード: body.recipient.countryCode
    })
    console.log('荷物情報:', {
      重量: `${body.package.weight}kg`
    })

    // 1. FedXアクセストークンを取得
    console.log('FedExアクセストークンを取得中...')
    const accessToken = await getFedExAccessToken()
    console.log('アクセストークン取得完了')

    // 2. FedEx Rate APIリクエストデータを構築
    const fedexRequestData = buildFedExRateRequest(body)
    console.log('FedX APIリクエストデータ:', JSON.stringify(fedexRequestData, null, 2))

    // 3. FedEx Rate APIを呼び出し
    console.log('FedEx Rate APIを呼び出し中...')
    const fedexResponse = await getFedExRates(accessToken, fedexRequestData)
    console.log('FedEx APIレスポンス:', JSON.stringify(fedexResponse, null, 2))

    // 4. レスポンスから料金情報を抽出
    const rates = fedexResponse.output.rateReplyDetails.map(detail => ({
      serviceName: detail.serviceName,
      amount: detail.ratedShipmentDetails[0].totalNetCharge,
      currency: detail.ratedShipmentDetails[0].currency
    }))

    console.log('抽出された料金情報:', rates)
    console.log('=========================================')

    const response: ShippingQuoteResponse = {
      success: true,
      message: 'FedXからの見積もりを正常に取得しました',
      rates: rates,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('FedEx API処理エラー:', error)
    
    const response: ShippingQuoteResponse = {
      success: false,
      message: 'FedX API処理中にエラーが発生しました',
      error: error instanceof Error ? error.message : '不明なエラー',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

// GETリクエストに対するエラーレスポンス
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'このエンドポイントはPOSTリクエストのみ対応しています',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  )
} 