import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareError } from 'square'
import { randomUUID } from 'crypto'

// Square clientの初期化
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
})

interface PaymentRequest {
  amount: number
  sourceId: string // Square Web SDKから送信されるトークン
}

export async function POST(request: NextRequest) {
  try {
    const { amount, sourceId }: PaymentRequest = await request.json()
    
    // バリデーション
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { error: '有効な金額が必要です' },
        { status: 400 }
      )
    }

    if (!sourceId || typeof sourceId !== 'string') {
      return NextResponse.json(
        { error: '有効な決済トークンが必要です' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: '金額は0より大きい値である必要があります' },
        { status: 400 }
      )
    }

    // 環境変数の確認
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.error('SQUARE_ACCESS_TOKEN environment variable is not set')
      return NextResponse.json(
        { error: 'Square APIキーが設定されていません' },
        { status: 500 }
      )
    }

    // Square Payments APIを使用して決済を作成
    const idempotencyKey = randomUUID()
    
    const createPaymentRequest = {
      sourceId: sourceId, // フロントエンドから受け取ったトークン
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: BigInt(amount),
        currency: 'JPY' as const
      }
    }

    const response = await squareClient.payments.create(createPaymentRequest)
    
    if (response.payment?.id) {
      // 決済が成功した場合、payment IDを返却
      return NextResponse.json({
        paymentId: response.payment.id,
        status: response.payment.status,
        amount: amount,
        currency: 'JPY'
      })
    } else {
      throw new Error('Payment作成に失敗しました')
    }

  } catch (error: unknown) {
    console.error('Payment作成エラー:', error)
    
    if (error instanceof SquareError) {
      const errorMessage = error.errors?.[0]?.detail || 'Square APIエラーが発生しました'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: '決済の処理に失敗しました' },
      { status: 500 }
    )
  }
} 