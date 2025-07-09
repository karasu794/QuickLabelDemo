import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Supabase clientの初期化（サービスロールキー使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
}

// ユーザー認証の取得（ship/route.tsから借用）
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return null

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
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

    // Supabaseへの下書き保存
    const draftData = {
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

    const { error: insertError } = await supabase
      .from('drafts')
      .insert([draftData])

    if (insertError) {
      console.error('下書き保存エラー:', insertError)
      return NextResponse.json(
        { 
          error: '下書きの保存に失敗しました',
          details: insertError.message
        },
        { status: 500 }
      )
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