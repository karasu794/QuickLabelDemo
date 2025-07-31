import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

// 現在の手数料率を取得する関数
async function getCurrentFeePercentage(): Promise<{ feePercentage: number; error?: string }> {
  try {
    console.log('🔐 管理者手数料設定取得開始')

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'service_fee_percentage')
      .single()

    if (error) {
      console.error('❌ 手数料設定取得エラー:', error)
      throw error
    }

    console.log('📊 取得した手数料率:', data.value)

    return { feePercentage: parseFloat(data.value) || 15 }

  } catch (error) {
    console.error('❌ 手数料設定取得エラー:', error)
    return { 
      feePercentage: 15, // デフォルト値
      error: '手数料設定の取得に失敗しました' 
    }
  }
}

// Server Action: 手数料率更新
async function updateFeeAction(formData: FormData) {
  'use server'
  
  const feePercentageStr = formData.get('feePercentage') as string
  console.log('🔄 手数料率更新開始:', feePercentageStr)

  // バリデーション
  const feePercentage = parseFloat(feePercentageStr)
  
  if (isNaN(feePercentage)) {
    console.error('❌ バリデーションエラー: 無効な数値')
    return redirect('/admin/fees?error=invalid_number')
  }

  if (feePercentage < 0 || feePercentage > 100) {
    console.error('❌ バリデーションエラー: 範囲外の値')
    return redirect('/admin/fees?error=out_of_range')
  }

  try {
    // ★★★ tryブロックはDB操作のみを囲む ★★★
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .update({ value: feePercentage.toString() })
      .eq('key', 'service_fee_percentage')
      .select('value')
      .single()

    if (error) {
      console.error('❌ 手数料率更新エラー:', error)
      return redirect('/admin/fees?error=update_failed')
    }

    console.log('✅ 手数料率更新成功:', data.value)

  } catch (error) {
    console.error('❌ Server Action 予期せぬエラー:', error)
    return redirect('/admin/fees?error=server_error')
  }

  // ★★★ 成功時の処理はtryの外側で行う ★★★
  revalidatePath('/admin/fees')
  return redirect('/admin/fees?success=updated')
}

// メッセージ表示コンポーネント
function MessageDisplay({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const success = searchParams.success
  const error = searchParams.error

  if (!success && !error) return null

  const getMessageContent = () => {
    if (success === 'updated') {
      return {
        type: 'success' as const,
        text: '手数料率を正常に更新しました'
      }
    }

    switch (error) {
      case 'invalid_number':
        return {
          type: 'error' as const,
          text: '有効な数値を入力してください'
        }
      case 'out_of_range':
        return {
          type: 'error' as const,
          text: '手数料率は0%から100%の間で入力してください'
        }
      case 'update_failed':
        return {
          type: 'error' as const,
          text: 'データベースの更新に失敗しました'
        }
      case 'server_error':
        return {
          type: 'error' as const,
          text: 'サーバーエラーが発生しました'
        }
      default:
        return {
          type: 'error' as const,
          text: '更新に失敗しました'
        }
    }
  }

  const message = getMessageContent()

  return (
    <div
      className={`rounded-lg p-4 flex items-center justify-between ${
        message.type === 'success'
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'
      }`}
    >
      <div className="flex items-center">
        {message.type === 'success' ? (
          <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <p
          className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {message.text}
        </p>
      </div>
    </div>
  )
}

// 現在の設定表示コンポーネント
function CurrentSettingsDisplay({ feePercentage }: { feePercentage: number }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">現在の設定</h2>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">サービス手数料率</p>
            <p className="text-3xl font-bold text-[#4D148C]">{feePercentage}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">手数料計算例</p>
            <p className="text-lg text-gray-900">
              送料 ¥10,000 → 手数料 ¥{(10000 * feePercentage / 100).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 手数料率更新フォームコンポーネント
function FeeUpdateForm({ currentFeePercentage }: { currentFeePercentage: number }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">手数料率の更新</h2>
        <p className="text-sm text-gray-600 mt-1">新しいサービス手数料率を設定してください</p>
      </div>
      <div className="p-6">
        <form action={updateFeeAction} className="space-y-6">
          {/* 手数料率入力 */}
          <div>
            <label htmlFor="feePercentage" className="block text-sm font-medium text-gray-700 mb-2">
              新しい手数料率（%）
            </label>
            <div className="relative">
              <input
                type="number"
                id="feePercentage"
                name="feePercentage"
                defaultValue={currentFeePercentage}
                min="0"
                max="100"
                step="0.1"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
                placeholder="例: 15.5"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 text-sm">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0%から100%の間で入力してください（小数点以下1桁まで）
            </p>
          </div>

          {/* 更新ボタン */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-3 bg-[#4D148C] text-white rounded-md hover:bg-[#3D0F6B] transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              手数料率を更新
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 注意事項コンポーネント
function NoticeSection() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ 重要な注意事項</h3>
      <ul className="text-yellow-800 text-sm space-y-2">
        <li>• 手数料率の変更は即座に適用され、新規作成される送り状に反映されます</li>
        <li>• 既に作成済みの送り状の手数料率は変更されません</li>
        <li>• 手数料率は送料に対して計算されます（商品価格には適用されません）</li>
        <li>• 変更前に十分に確認してから更新してください</li>
      </ul>
    </div>
  )
}

// エラー表示コンポーネント
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  )
}

// メインページコンポーネント（サーバーコンポーネント）
export default async function FeesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const { feePercentage, error } = await getCurrentFeePercentage()

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">手数料管理</h1>
          <p className="text-gray-600">サービス手数料率の設定を管理します</p>
        </div>
      </div>

      {/* メッセージ表示 */}
      <MessageDisplay searchParams={searchParams} />

      {/* エラー表示（データ取得エラーの場合） */}
      {error && <ErrorDisplay error={error} />}

      {/* 現在の設定表示 */}
      <CurrentSettingsDisplay feePercentage={feePercentage} />

      {/* 手数料率更新フォーム */}
      <FeeUpdateForm currentFeePercentage={feePercentage} />

      {/* 注意事項 */}
      <NoticeSection />
    </div>
  )
} 