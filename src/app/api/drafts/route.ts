import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createRouteHandlerClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

// Supabase client（サービスロール・ラッパ）
const supabase = createServiceRoleClient()

// DIAG: 下書き保存はあるが、disclaimer_agreed / disclaimer_agreed_at / terms_version の保存項目が存在しない。
// DIAG: review画面の同意情報を保持して決済前の二段階保存に使える拡張余地あり。

// リクエストの型定義
interface DraftRequest {
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
  }
  packages: Array<{
    weight: string
    type: string
    length?: string
    width?: string
    height?: string
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
  shippingPurpose: string
  selectedRate?: {
    serviceName: string
    amount: number
    currency: string
    transitTime?: string
    serviceType?: string
  }
  // consent
  disclaimer_agreed?: boolean
  disclaimer_agreed_at?: string
  terms_version?: string
}

// ユーザー認証の取得（Route HandlerのCookieベース認証）
async function getUserFromRequest(_request: NextRequest): Promise<string | null> {
  try {
    const rt = createRouteHandlerClient()
    const { data: { user }, error } = await rt.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch (error) {
    console.error('ユーザー認証エラー:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: DraftRequest = await request.json()
    
    console.log('📝 下書き保存処理を開始')

    // 入力データのバリデーション（基本的なフィールドのみチェック）
    if (!data.shipperInfo && !data.recipientInfo && !data.packages) {
      return NextResponse.json(
        { error: '保存するデータが不足しています' },
        { status: 400 }
      )
    }

    // ユーザー認証情報の取得
    const userId = await getUserFromRequest(request)

    // 下書きIDの生成
    const draftId = randomUUID()

    // Supabaseへの下書き保存（同意列は存在しない環境に配慮）
    const draftDataBase: any = {
      id: draftId,
      status: 'draft',
      user_id: userId,
      
      // 荷送人情報
      shipper_company: data.shipperInfo?.companyName || '',
      shipper_contact: data.shipperInfo?.contactName || '',
      shipper_phone: data.shipperInfo?.phoneNumber || '',
      shipper_postal_code: data.shipperInfo?.postalCode || '',
      shipper_city: data.shipperInfo?.cityName || '',
      shipper_address1: data.shipperInfo?.address1 || '',
      shipper_address2: data.shipperInfo?.address2 || '',
      shipper_country: data.shipperInfo?.countryCode || '',
      shipper_state: data.shipperInfo?.stateCode || '',
      
      // 荷受人情報
      recipient_company: data.recipientInfo?.companyName || '',
      recipient_contact: data.recipientInfo?.contactName || '',
      recipient_phone: data.recipientInfo?.phoneNumber || '',
      recipient_email: data.recipientInfo?.email || '',
      recipient_country: data.recipientInfo?.countryCode || '',
      recipient_postal_code: data.recipientInfo?.postalCode || '',
      recipient_city: data.recipientInfo?.cityName || '',
      recipient_address1: data.recipientInfo?.address1 || '',
      recipient_address2: data.recipientInfo?.address2 || '',
      recipient_state: data.recipientInfo?.stateCode || '',
      
      // 荷物・商品情報（JSON形式）
      packages: data.packages ? JSON.stringify(data.packages) : null,
      items: data.items ? JSON.stringify(data.items) : null,
      shipping_purpose: data.shippingPurpose || '',
      
      // 選択された料金情報（JSON形式）
      selected_rate: data.selectedRate ? JSON.stringify(data.selectedRate) : null,
    }
    // 同意列がある環境では付与する（存在しない場合はPGRST204が返るためフォールバック）
    const draftDataWithConsent: any = {
      ...draftDataBase,
      disclaimer_agreed: Boolean(data.disclaimer_agreed) || false,
      disclaimer_agreed_at: data.disclaimer_agreed_at ? new Date(data.disclaimer_agreed_at) : null,
      terms_version: data.terms_version || null,
    }

    let insertedOk = false
    {
      const { error: insertWithConsentErr } = await supabase
        .from('drafts' as any)
        .insert([draftDataWithConsent])
      if (!insertWithConsentErr) {
        insertedOk = true
      } else {
        // PGRST204: スキーマに列が存在しない環境 → 同意列を除いて再試行
        const needsFallback = String(insertWithConsentErr?.code || '') === 'PGRST204' ||
          /disclaimer_agreed|terms_version/i.test(String(insertWithConsentErr?.message || ''))
        if (needsFallback) {
          console.warn('drafts: 同意列が存在しないためフォールバック挿入を実行します')
          const { error: insertFallbackErr } = await supabase
            .from('drafts' as any)
            .insert([draftDataBase])
          if (!insertFallbackErr) {
            insertedOk = true
          } else {
            console.error('下書き保存エラー(FALLBACK失敗):', insertFallbackErr)
            return NextResponse.json(
              { error: '下書きの保存に失敗しました', details: insertFallbackErr.message },
              { status: 500 }
            )
          }
        } else {
          console.error('下書き保存エラー:', insertWithConsentErr)
          return NextResponse.json(
            { error: '下書きの保存に失敗しました', details: insertWithConsentErr.message },
            { status: 500 }
          )
        }
      }
    }

    console.log('✅ 下書き保存完了:', draftId)

    return NextResponse.json({
      success: true,
      draftId: draftId,
      message: '下書きを保存しました'
    })

  } catch (error) {
    console.error('下書き保存処理エラー:', error)
    return NextResponse.json(
      { 
        error: '下書きの保存に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 

// FIX: 最新ドラフトを返すGETを追加し、同意状態の復元に利用
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const { data } = await supabase
      .from('drafts' as any)
      .select('id, disclaimer_agreed, disclaimer_agreed_at, terms_version, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json({
      ok: true,
      draft: data || null,
    })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}