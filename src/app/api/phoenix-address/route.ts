import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// サービスロールキーを使用したSupabase client（サーバーサイド専用）
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

export async function GET(request: NextRequest) {
  try {
    console.log('🏢 フェニックス住所情報取得API開始（パブリック）')

    // Supabaseから自社住所情報を取得
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'phoenix_address')
      .single()

    if (error) {
      console.error('❌ フェニックス住所情報取得エラー:', error)
      
      // データが存在しない場合
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'フェニックス住所情報が設定されていません'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'フェニックス住所情報の取得に失敗しました'
      }, { status: 500 })
    }

    console.log('📊 フェニックス住所情報取得成功')

    // JSONを解析
    let companyInfo
    try {
      companyInfo = JSON.parse(data.value)
    } catch (parseError) {
      console.error('❌ JSON解析エラー:', parseError)
      return NextResponse.json({
        success: false,
        error: 'フェニックス住所情報の形式が正しくありません'
      }, { status: 500 })
    }

    // 必要な情報が揃っているかチェック
    if (!companyInfo.contactName || !companyInfo.postalCode || !companyInfo.address1 || !companyInfo.phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'フェニックス住所情報が不完全です。管理者にお問い合わせください。'
      }, { status: 400 })
    }

    console.log('✅ フェニックス住所情報取得完了（パブリック）')

    return NextResponse.json({
      success: true,
      data: companyInfo
    })

  } catch (error) {
    console.error('❌ フェニックス住所情報取得API予期せぬエラー:', error)
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  }
} 