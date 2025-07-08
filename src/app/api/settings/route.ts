import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase client（service role）
const getSupabaseServiceClient = () => {
  return createClient()
}

// GETリクエスト: 現在のサービス手数料率を取得
export async function GET() {
  try {
    const supabase = getSupabaseServiceClient()

    // app_settingsテーブルからservice_fee_percentageを取得
    const { data, error } = await (supabase as any)
      .from('app_settings')
      .select('value')
      .eq('key', 'service_fee_percentage')
      .single()

    if (error) {
      console.error('設定取得エラー:', error)
      return NextResponse.json(
        { error: '設定の取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!data) {
      // 設定が存在しない場合、デフォルト値を返却
      return NextResponse.json({
        service_fee_percentage: 15 // デフォルト15%
      })
    }

    // valueは文字列として保存されているため、数値に変換
    const feePercentage = parseFloat(data.value as string)

    return NextResponse.json({
      service_fee_percentage: feePercentage
    })

  } catch (error) {
    console.error('設定取得エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POSTリクエスト: サービス手数料率を更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fee } = body

    // バリデーション
    if (typeof fee !== 'number') {
      return NextResponse.json(
        { error: '手数料率は数値で入力してください' },
        { status: 400 }
      )
    }

    if (fee < 0 || fee > 100) {
      return NextResponse.json(
        { error: '手数料率は0%から100%の間で入力してください' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // app_settingsテーブルでservice_fee_percentageをUPSERT
    const { error } = await (supabase as any)
      .from('app_settings')
      .upsert({
        key: 'service_fee_percentage',
        value: fee.toString(), // JSONB型なので文字列として保存
        description: 'サービス手数料率（パーセンテージ）',
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('設定更新エラー:', error)
      return NextResponse.json(
        { error: '設定の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`サービス手数料率を ${fee}% に更新しました`)

    return NextResponse.json({
      success: true,
      message: 'サービス手数料率を正常に更新しました',
      service_fee_percentage: fee
    })

  } catch (error) {
    console.error('設定更新エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUTリクエスト（POSTと同じ動作）
export async function PUT(request: NextRequest) {
  return POST(request)
} 