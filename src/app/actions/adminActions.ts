'use server'

import { createClient } from '@supabase/supabase-js'
import { getFedExAccessToken, getFedExCredentialsByOrigin } from '@/lib/fedex/auth'
// createServerClient と CookieOptions を ssr からインポート
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

interface AdminCancelResult {
  success: boolean
  message: string
  error?: string
}

/**
 * 管理者用発送キャンセルServer Action
 * @param trackingNumber FedEx追跡番号
 * @returns キャンセル結果
 */
export async function adminCancelShipmentAction(trackingNumber: string): Promise<AdminCancelResult> {
  // Demo mode guard
  if (process.env.APP_ENV === 'demo') {
    return { success: false, message: 'この操作（管理者キャンセル）はデモ環境では無効です。' }
  }

  try {
    console.log('🔐 管理者発送キャンセル処理開始:', trackingNumber)

    // 1. クッキーストアの初期化
    const cookieStore = cookies()

    // クッキーの状況をデバッグ
    console.log('🍪 クッキーデバッグ開始...')
    const allCookies = cookieStore.getAll()
    console.log('🍪 全クッキー:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    // Supabaseの認証関連クッキーを確認
    const authCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('auth'))
    console.log('🍪 認証関連クッキー:', authCookies.map(c => ({ 
      name: c.name, 
      valueLength: c.value?.length || 0 
    })))

    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value
            console.log(`🍪 クッキー取得: ${name} = ${value ? '有り' : '無し'}`)
            return value
          },
          set(name: string, value: string, options: CookieOptions) {
            console.log(`🍪 クッキー設定: ${name}`)
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            console.log(`🍪 クッキー削除: ${name}`)
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 2. 管理者権限チェック（既存のコード）
    console.log('📊 セッション取得開始...')
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
    console.log('📊 セッション結果:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      sessionError: sessionError?.message 
    })
    
    const user = session?.user
    
    if (!user) {
      console.error('❌ ユーザー情報が取得できませんでした:', { session, sessionError })
      return {
        success: false,
        message: 'ユーザー認証に失敗しました',
        error: 'Authentication failed'
      }
    }

    console.log('✅ ユーザー認証成功:', user.id)
    
    console.log('📊 プロフィール取得開始...', user.id)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('📊 プロフィール結果:', { 
      hasProfile: !!profile, 
      role: profile?.role, 
      profileError: profileError?.message 
    })

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('❌ 管理者権限チェック失敗:', { profileError, profile })
      return {
        success: false,
        message: 'この操作には管理者権限が必要です',
        error: 'Admin permission required'
      }
    }

    console.log('✅ 管理者権限確認完了')

    // 3. 対象レコードの取得（Square情報も含める）
    console.log('💾 データベースステータス更新中...', { trackingNumber })
    
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from('shipments')
      .select('id, status, tracking_number, payment_id, square_payment_id, total_amount')
      .eq('tracking_number', trackingNumber)
      .single()

    console.log('🔍 更新対象レコード確認:', { 
      found: !!existingRecord, 
      recordId: existingRecord?.id, 
      currentStatus: existingRecord?.status,
      trackingNumber: existingRecord?.tracking_number,
      paymentId: existingRecord?.payment_id,
      squarePaymentId: existingRecord?.square_payment_id,
      amount: existingRecord?.total_amount,
      checkError: checkError?.message 
    })

    if (checkError || !existingRecord) {
      console.error('❌ 更新対象レコードが見つかりません:', { trackingNumber, checkError })
      return {
        success: false,
        message: 'キャンセル対象の取引が見つかりませんでした',
        error: 'Record not found for update'
      }
    }

    // 4. FedExキャンセル処理（基幹仕様対応）
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

    // 5. FedEx認証情報を取得（基幹仕様対応）
    // キャンセル処理では日本発送を前提として輸出用認証情報を使用
    const credentials = getFedExCredentialsByOrigin('JP')

    // 6. FedEx Ship API Cancel エンドポイントを呼び出し
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
      console.error('❌ FedXキャンセルエラー:', responseText)
      
      // FedEx APIエラーをパース
      let errorMessage = 'FedXキャンセル処理に失敗しました'
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

    // 5. Square返金処理
    if (existingRecord.square_payment_id) {
      try {
        console.log('💰 Square返金処理開始:', {
          paymentId: existingRecord.square_payment_id,
          amount: existingRecord.total_amount
        })

        const response = await fetch('https://connect.squareupsandbox.com/v2/refunds', {
          method: 'POST',
          headers: {
            'Square-Version': '2024-01-18',
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            idempotency_key: `refund_${existingRecord.id}_${Date.now()}`,
            payment_id: existingRecord.square_payment_id,
            amount_money: {
              amount: Math.round(existingRecord.total_amount * 100), // Squareは最小通貨単位（銭）で指定
              currency: 'JPY'
            },
            reason: 'FedEx shipment cancelled'
          })
        })

        const refundResult = await response.json()

        if (!response.ok) {
          console.error('❌ Square返金エラー:', refundResult)
          throw new Error(`Square返金処理に失敗しました: ${refundResult.errors?.[0]?.detail || '不明なエラー'}`)
        }

        console.log('✅ Square返金処理完了:', {
          refundId: refundResult.refund.id,
          status: refundResult.refund.status
        })

        // 6. データベース更新（両方のステータスを更新）
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('shipments')
          .update({
            shipping_status: 'cancelled',
            payment_status: 'refunded',
            square_refund_id: refundResult.refund.id,
            refund_reason: 'FedEx shipment cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select('id, shipping_status, payment_status, tracking_number')

        console.log('📊 データベース更新結果:', { 
          success: !updateError, 
          updateData,
          updateError: updateError?.message 
        })

        if (updateError) {
          throw new Error(`データベース更新エラー: ${updateError.message}`)
        }

        return {
          success: true,
          message: `追跡番号 ${trackingNumber} の発送がキャンセルされ、返金処理が完了しました`
        }

      } catch (squareError) {
        console.error('❌ Square返金処理エラー:', squareError)
        return {
          success: false,
          message: 'FedExキャンセルは完了しましたが、返金処理に失敗しました。カスタマーサポートにお問い合わせください。',
          error: squareError instanceof Error ? squareError.message : '返金処理エラー'
        }
      }
    } else {
      // Square決済IDがない場合は輸送ステータスのみ更新
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('shipments')
        .update({
          shipping_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .select('id, shipping_status, payment_status, tracking_number')

      console.log('📊 データベース更新結果（輸送のみ）:', { 
        success: !updateError, 
        updateData,
        updateError: updateError?.message 
      })

      if (updateError) {
        throw new Error(`データベース更新エラー: ${updateError.message}`)
      }

      return {
        success: true,
        message: `追跡番号 ${trackingNumber} の発送がキャンセルされました`
      }
    }

  } catch (error) {
    console.error('❌ 管理者発送キャンセル処理エラー:', error)
    return {
      success: false,
      message: 'キャンセル処理中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 