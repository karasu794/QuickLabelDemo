import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFedExAccessToken, getFedExCredentialsByOrigin } from '@/lib/fedex/auth'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// サービスロールキーを使用したSupabase client
const supabaseAdmin = createServiceRoleClient()

// FedEx Cancel API 共通関数（正しいAPI仕様に基づく実装）
async function cancelFedExShipment(accessToken: string, trackingNumber: string, shipperCountry: string) {
  const cancelUrl = 'https://apis.fedex.com/ship/v1/shipments/cancel'
  const credentials = getFedExCredentialsByOrigin(shipperCountry)

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

    throw new Error(errorMessage)
  }

  return response.ok ? JSON.parse(responseText) : null
}

/**
 * 🚀 POST /api/shipments/[shipmentId]/cancel
 */
export async function POST(request: NextRequest, { params }: { params: { shipmentId: string } }) {
  const { shipmentId } = params

  if (!shipmentId) {
    return NextResponse.json({ error: 'shipmentIdが指定されていません' }, { status: 400 })
  }

  try {
    console.log('📦 出荷キャンセル処理開始 (shipmentId):', shipmentId)

    // 1. 正しい認証方法でSupabaseクライアントを作成
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

    // 2. ユーザー認証確認
    const { data: { session } } = await supabaseClient.auth.getSession()
    const user = session?.user
    
    if (!user) {
      return NextResponse.json({ error: 'ユーザー認証に失敗しました' }, { status: 401 })
    }

    // 3. 📦 出荷情報を取得
    const { data: shipment, error: shipError } = await supabaseAdmin
      .from('shipments')
      .select('id, user_id, tracking_number, status, shipper_country')
      .eq('id', shipmentId)
      .single()

    if (shipError || !shipment) {
      console.error('出荷情報取得エラー:', shipError)
      return NextResponse.json({ error: '出荷情報が見つかりません' }, { status: 404 })
    }

    // 4. 👮‍♂️ 権限チェック（本人 または admin）
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    if (shipment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'キャンセル権限がありません' }, { status: 403 })
    }

    // 5. 既にキャンセル済みかチェック
    if (shipment.status === 'CANCELED' || shipment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'すでにキャンセル済みです' }, { status: 400 })
    }

    // 6. 🔑 FedExアクセストークン取得（発送元の国コードで動的切替）
    let accessToken: string
    try {
      // 基幹仕様: キャンセル処理では発送元国に応じた認証を使用
      accessToken = await getFedExAccessToken(shipment.shipper_country || 'JP')
      console.log('✅ FedEx認証完了')
    } catch (error) {
      console.error('❌ FedEx認証エラー:', error)
      return NextResponse.json({ 
        error: 'FedEx認証に失敗しました',
        details: 'FedEx authentication failed'
      }, { status: 500 })
    }

    // 7. FedEx APIでキャンセル実行
    try {
      await cancelFedExShipment(accessToken, shipment.tracking_number, shipment.shipper_country || 'JP')
      console.log('✅ FedEx キャンセル成功')
    } catch (error) {
      console.error('❌ FedEx キャンセルエラー:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'FedExキャンセル処理に失敗しました',
        details: 'FedEx cancel failed'
      }, { status: 500 })
    }

    // 8. DBのステータス更新
    const { error: updateError } = await supabaseAdmin
      .from('shipments')
      .update({ 
        status: 'CANCELED', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', shipmentId)

    if (updateError) {
      console.error('❌ データベース更新エラー:', updateError)
      return NextResponse.json({ 
        error: 'FedXキャンセルは完了しましたが、データベースの更新に失敗しました',
        details: 'Database update failed' 
      }, { status: 500 })
    }

    console.log('✅ 出荷キャンセル処理完了')

    return NextResponse.json({ 
      success: true, 
      message: `追跡番号 ${shipment.tracking_number} の発送がキャンセルされました` 
    })

  } catch (error) {
    console.error('❌ キャンセル処理エラー:', error)
    return NextResponse.json({ 
      error: 'キャンセル処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
