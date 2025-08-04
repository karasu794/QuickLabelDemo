'use server'

import { createClient } from '@supabase/supabase-js'
import { getFedExAccessToken, getFedExCredentialsByOrigin } from '@/lib/fedex/auth'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// サービスロールキーを使用したSupabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface CancelShipmentResult {
  success: boolean
  message: string
  error?: string
}

/**
 * 発送をキャンセルし、返金処理を行うServer Action
 * @param trackingNumber FedEx追跡番号
 * @param squarePaymentId Square決済ID（返金用）
 * @returns キャンセル結果
 */
export async function cancelShipmentAction(trackingNumber: string, squarePaymentId: string): Promise<CancelShipmentResult> {
  // 関数冒頭でSupabaseクライアントを定義
  const cookieStore = cookies()

  const supabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    console.log('📦 発送キャンセル処理開始:', trackingNumber)

    // 1. 入力バリデーション
    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return {
        success: false,
        message: '無効な追跡番号です',
        error: 'Invalid tracking number'
      }
    }

    if (!squarePaymentId || typeof squarePaymentId !== 'string') {
      return {
        success: false,
        message: '無効な決済IDです',
        error: 'Invalid square payment ID'
      }
    }

    // 2. ユーザー認証確認（middlewareと同じパターンでgetSession()を使用）
    const { data: { session } } = await supabaseClient.auth.getSession()
    const user = session?.user
    
    if (!user) {
      return {
        success: false,
        message: 'ユーザー認証に失敗しました',
        error: 'Authentication failed'
      }
    }

    // 荷物情報を取得し、ユーザー権限と決済IDを確認
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .eq('payment_id', squarePaymentId) // 決済IDも一致確認
      .eq('user_id', user.id) // ユーザー自身の荷物のみ
      .single()

    if (shipmentError || !shipment) {
      console.error('荷物情報取得エラー:', shipmentError)
      return {
        success: false,
        message: '該当する発送が見つからないか、決済IDが一致しません',
        error: 'Shipment not found or payment ID mismatch'
      }
    }

    // 既にキャンセル済みかチェック
    if (shipment.status === 'CANCELLED') {
      return {
        success: false,
        message: 'この発送は既にキャンセル済みです',
        error: 'Already cancelled'
      }
    }

    // 3. FedEx認証トークンを取得（基幹仕様対応）
    let accessToken: string
    try {
      // 🚨 基幹仕様: キャンセル処理では日本発送を前提として輸出用認証を使用
      accessToken = await getFedExAccessToken('JP')
      console.log('✅ FedEx認証完了（輸出用認証使用）')
    } catch (error) {
      console.error('❌ FedEx認証エラー:', error)
      return {
        success: false,
        message: 'FedEx認証に失敗しました',
        error: 'FedEx authentication failed'
      }
    }

    // 4. FedEx認証情報を取得（基幹仕様対応）
    // キャンセル処理では日本発送を前提として輸出用認証情報を使用
    const credentials = getFedExCredentialsByOrigin('JP')

    // 5. FedEx Ship API Cancel エンドポイントを呼び出し
    const cancelUrl = 'https://apis.fedex.com/ship/v1/shipments/cancel'

    const cancelRequest = {
      accountNumber: {
        value: credentials.accountNumber
      },
      trackingNumber: trackingNumber
    }

    console.log('📞 FedEx Cancel API呼び出し中...')
    console.log('Cancel Request:', JSON.stringify(cancelRequest, null, 2))

    const response = await fetch(cancelUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-locale': 'ja_JP',
      },
      body: JSON.stringify(cancelRequest),
    })

    const responseText = await response.text()
    console.log(`FedEx Cancel レスポンス: ${response.status}`)
    console.log('Cancel Response:', responseText)

    if (!response.ok) {
      console.error('❌ FedExキャンセルエラー:', responseText)
      
      // FedEx APIエラーをパース
      let errorMessage = 'FedExキャンセル処理に失敗しました'
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage
        }
      } catch (parseError) {
        // JSON解析失敗時はデフォルトメッセージを使用
      }

      return {
        success: false,
        message: errorMessage,
        error: `FedEx API Error: ${response.status}`
      }
    }

    // 6. FedXでキャンセル成功後、Square返金処理を実行
    console.log('🚀 === Step 2: Square返金処理 ===')
    
    let refundCompleted = false
    try {
      console.log('💰 Square返金処理開始:', squarePaymentId)
      
      // Square Client初期化
      const { SquareClient, SquareEnvironment } = await import('square')
      const squareClient = new SquareClient({
        token: process.env.SQUARE_ACCESS_TOKEN!,
        environment: process.env.NODE_ENV === 'production' 
          ? SquareEnvironment.Production 
          : SquareEnvironment.Sandbox
      })

      // 返金リクエストを作成
      const { randomUUID } = await import('crypto')
      const refundRequest = {
        paymentId: squarePaymentId,
        amountMoney: {
          amount: BigInt(shipment.total_amount), // 既に整数として保存されている想定
          currency: 'JPY' as const
        },
        idempotencyKey: randomUUID(),
        reason: `発送キャンセルによる返金 - 追跡番号: ${trackingNumber}`
      }

      console.log('💳 Square Refunds API呼び出し中...')
      const refundResponse = await squareClient.refunds.refundPayment(refundRequest)

      if (!refundResponse.refund?.id) {
        throw new Error('返金レスポンスが無効です')
      }

      if (refundResponse.refund.status !== 'APPROVED' && refundResponse.refund.status !== 'PENDING') {
        throw new Error(`返金処理が失敗しました。ステータス: ${refundResponse.refund.status}`)
      }

      refundCompleted = true
      console.log('✅ Square返金処理完了:', refundResponse.refund.id)

    } catch (refundError) {
      console.error('❌ Square返金エラー:', refundError)
      return {
        success: false,
        message: 'FedXではキャンセル済みですが、返金処理に失敗しました。サポートにお問い合わせください。',
        error: `Refund failed: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`
      }
    }

    // 7. 両方成功後、Supabaseのステータスを更新
    console.log('🚀 === Step 3: データベースステータス更新 ===')
    
    const { error: updateError } = await supabaseAdmin
      .from('shipments')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('tracking_number', trackingNumber)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('❌ データベース更新エラー:', updateError)
      return {
        success: false,
        message: 'FedXキャンセルと返金は完了しましたが、データベースの更新に失敗しました',
        error: 'Database update failed'
      }
    }

    console.log('✅ 発送キャンセル・返金処理完了')

    return {
      success: true,
      message: `追跡番号 ${trackingNumber} の発送がキャンセルされ、返金処理も完了しました`
    }

  } catch (error) {
    console.error('❌ 発送キャンセル処理エラー:', error)
    return {
      success: false,
      message: 'キャンセル処理中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 