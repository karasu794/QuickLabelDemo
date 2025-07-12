import { NextRequest, NextResponse } from 'next/server'

interface HSCodeRequest {
  searchText: string
  destinationCountryCode: string
}

interface HSCodeResponse {
  code: string
  description: string
}

// 仮想化サービス用のテストデータ
const getVirtualizedHSCodes = (searchText: string, destinationCountryCode: string): HSCodeResponse[] => {
  // 検索テキストに応じて事前定義されたテストデータを返す
  const testData: Record<string, HSCodeResponse[]> = {
    'コットン': [
      { code: '5201.00.00', description: 'Cotton, not carded or combed' },
      { code: '5208.11.00', description: 'Woven fabrics of cotton' },
      { code: '6109.10.00', description: 'T-shirts of cotton' }
    ],
    'プラスチック': [
      { code: '3920.10.00', description: 'Plates, sheets, film, foil and strip, of polymers of ethylene' },
      { code: '3923.30.00', description: 'Carboys, bottles, flasks and similar articles' },
      { code: '3926.90.00', description: 'Other articles of plastics' }
    ],
    'metal': [
      { code: '7326.90.00', description: 'Other articles of iron or steel' },
      { code: '8301.20.00', description: 'Locks of a kind used for motor vehicles' },
      { code: '7323.93.00', description: 'Table, kitchen or other household articles of stainless steel' }
    ],
    'textile': [
      { code: '6302.21.00', description: 'Bed linen of cotton' },
      { code: '6303.12.00', description: 'Curtains of synthetic fibres' },
      { code: '6307.90.00', description: 'Other made up articles of textiles' }
    ],
    'electronic': [
      { code: '8517.12.00', description: 'Telephones for cellular networks' },
      { code: '8528.72.00', description: 'Reception apparatus for television' },
      { code: '8471.30.00', description: 'Portable automatic data processing machines' }
    ]
  }

  // 検索テキストに含まれるキーワードをチェック
  const searchLower = searchText.toLowerCase()
  for (const [keyword, codes] of Object.entries(testData)) {
    if (searchLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(searchLower)) {
      return codes
    }
  }

  // デフォルトのテストデータ
  return [
    { code: '9999.99.99', description: `Test HSCode for ${searchText}` },
    { code: '8888.88.88', description: `Alternative HSCode for ${searchText}` }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body: HSCodeRequest = await request.json()
    const { searchText, destinationCountryCode } = body

    // 入力検証
    if (!searchText || !destinationCountryCode) {
      return NextResponse.json(
        { error: '検索テキストと仕向国コードが必要です' },
        { status: 400 }
      )
    }

    // 検索テキストの最小長チェック
    if (searchText.length < 2) {
      return NextResponse.json(
        { error: '検索テキストは2文字以上である必要があります' },
        { status: 400 }
      )
    }

    console.log('HSコード検索リクエスト:', { searchText, destinationCountryCode })

    // まずFedX APIを試行
    try {
      // FedX認証トークンを取得
      const authResponse = await fetch('https://apis-sandbox.fedex.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.FEDEX_API_KEY || '',
          client_secret: process.env.FEDEX_SECRET_KEY || '',
        }),
      })

      if (!authResponse.ok) {
        console.error('FedX認証エラー:', await authResponse.text())
        throw new Error('FedX認証に失敗しました')
      }

      const authData = await authResponse.json()
      const accessToken = authData.access_token

      console.log('FedEx認証成功 - アクセストークン取得:', accessToken ? '取得済み' : '未取得')

      // HSコード検索リクエストボディ（仮想化サービス対応）
      const hsCodeRequestBody = {
        searchText: searchText,
        searchType: 'DESCRIPTION',
        searchLevel: 'FULL',
        destinationCountryCode: destinationCountryCode,
        shipDate: new Date().toISOString().split('T')[0],
        resultsRequested: 10,
        processingOptions: {
          options: ['APPLY_SPELLING_CHECK', 'FORMAT_HS_CODE']
        }
      }

      console.log('HSコード検索リクエストボディ:', JSON.stringify(hsCodeRequestBody, null, 2))

      // FedX HSコード検索APIを試行
      const hsCodeResponse = await fetch('https://apis-sandbox.fedex.com/commodity/v1/hscodes/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-locale': 'en_US',
          'authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(hsCodeRequestBody),
      })

      if (hsCodeResponse.ok) {
        const hsCodeData = await hsCodeResponse.json()
        
        // レスポンスをフォーマット
        const suggestions: HSCodeResponse[] = []
        
        if (hsCodeData.transactionId && hsCodeData.output && hsCodeData.output.results) {
          hsCodeData.output.results.forEach((result: any) => {
            if (result.harmonizedCode && result.description) {
              suggestions.push({
                code: result.harmonizedCode,
                description: result.description
              })
            }
          })
        }

        console.log('FedX HSコード検索成功:', suggestions.length, '件')
        return NextResponse.json(suggestions)
      } else {
        const errorText = await hsCodeResponse.text()
        console.error('FedX HSコード検索エラー:', errorText)
        throw new Error(`FedX API Error: ${hsCodeResponse.status}`)
      }

    } catch (fedexError) {
      console.log('FedX APIエラー（仮想化テストデータにフォールバック）:', fedexError)
      
      // FedX APIが失敗した場合、仮想化テストデータを使用
      const virtualizedCodes = getVirtualizedHSCodes(searchText, destinationCountryCode)
      
      console.log('仮想化テストデータを使用:', virtualizedCodes.length, '件')
      
      return NextResponse.json(virtualizedCodes)
    }

  } catch (error) {
    console.error('HSコード検索API エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 