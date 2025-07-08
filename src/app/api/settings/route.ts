import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Service Role Key用のSupabaseクライアント
const getSupabaseServiceClient = () => {
  return createServiceRoleClient()
}

export async function GET() {
  try {
    console.log('設定API: Service Role Keyクライアント使用開始')
    
    const supabase = getSupabaseServiceClient()
    
    // app_settingsテーブルからサービス手数料率を取得
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('key, value, description')
      .eq('key', 'service_fee_percentage')
      .single()

    if (error) {
      console.error('設定取得エラー:', error)
      return NextResponse.json(
        { error: '設定の取得に失敗しました', details: error.message },
        { status: 500 }
      )
    }

    if (!settings) {
      console.log('設定が見つかりません。デフォルト値を使用します。')
      return NextResponse.json({
        key: 'service_fee_percentage',
        value: '15',
        description: 'サービス手数料率（パーセンテージ）'
      })
    }

    console.log('設定取得成功:', settings)
    return NextResponse.json(settings)

  } catch (error) {
    console.error('設定API内部エラー:', error)
    return NextResponse.json(
      { 
        error: '内部サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('設定更新API: Service Role Keyクライアント使用開始')
    
    const supabase = getSupabaseServiceClient()
    const body = await request.json()
    
    const { key, value, description } = body

    if (!key || !value) {
      return NextResponse.json(
        { error: 'keyとvalueは必須項目です' },
        { status: 400 }
      )
    }

    // 設定を更新（存在しない場合は作成）
    const { data: updatedSetting, error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('設定更新エラー:', error)
      return NextResponse.json(
        { error: '設定の更新に失敗しました', details: error.message },
        { status: 500 }
      )
    }

    console.log('設定更新成功:', updatedSetting)
    return NextResponse.json(updatedSetting)

  } catch (error) {
    console.error('設定更新API内部エラー:', error)
    return NextResponse.json(
      { 
        error: '内部サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 