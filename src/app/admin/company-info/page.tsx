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

// 自社情報の型定義
interface CompanyInfo {
  contactName: string
  companyName: string
  postalCode: string
  address1: string
  address2: string
  phoneNumber: string
  email: string
}

// 現在の自社情報を取得する関数
async function getCurrentCompanyInfo(): Promise<{ companyInfo: CompanyInfo; error?: string }> {
  try {
    console.log('🔐 管理者自社情報取得開始')

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'phoenix_address')
      .single()

    if (error) {
      console.error('❌ 自社情報取得エラー:', error)
      // データが存在しない場合はデフォルト値を返す
      if (error.code === 'PGRST116') {
        return {
          companyInfo: {
            contactName: '',
            companyName: '',
            postalCode: '',
            address1: '',
            address2: '',
            phoneNumber: '',
            email: ''
          }
        }
      }
      throw error
    }

    console.log('📊 取得した自社情報:', data.value)

    let companyInfo: CompanyInfo
    try {
      companyInfo = JSON.parse(data.value)
    } catch {
      // JSONパースに失敗した場合はデフォルト値
      companyInfo = {
        contactName: '',
        companyName: '',
        postalCode: '',
        address1: '',
        address2: '',
        phoneNumber: '',
        email: ''
      }
    }

    return { companyInfo }

  } catch (error) {
    console.error('❌ 自社情報取得エラー:', error)
    return { 
      companyInfo: {
        contactName: '',
        companyName: '',
        postalCode: '',
        address1: '',
        address2: '',
        phoneNumber: '',
        email: ''
      },
      error: '自社情報の取得に失敗しました' 
    }
  }
}

// Server Action: 自社情報更新
async function updateCompanyInfoAction(formData: FormData) {
  'use server'
  
  const contactName = formData.get('contactName') as string
  const companyName = formData.get('companyName') as string
  const postalCode = formData.get('postalCode') as string
  const address1 = formData.get('address1') as string
  const address2 = formData.get('address2') as string
  const phoneNumber = formData.get('phoneNumber') as string
  const email = formData.get('email') as string

  console.log('🔄 自社情報更新開始')

  // バリデーション
  if (!contactName.trim()) {
    console.error('❌ バリデーションエラー: 担当者名が入力されていません')
    return redirect('/admin/company-info?error=contact_name_required')
  }

  if (!postalCode.trim()) {
    console.error('❌ バリデーションエラー: 郵便番号が入力されていません')
    return redirect('/admin/company-info?error=postal_code_required')
  }

  if (!address1.trim()) {
    console.error('❌ バリデーションエラー: 住所1が入力されていません')
    return redirect('/admin/company-info?error=address1_required')
  }

  if (!phoneNumber.trim()) {
    console.error('❌ バリデーションエラー: 電話番号が入力されていません')
    return redirect('/admin/company-info?error=phone_number_required')
  }

  // 更新データを作成
  const companyInfo: CompanyInfo = {
    contactName: contactName.trim(),
    companyName: companyName.trim(),
    postalCode: postalCode.trim(),
    address1: address1.trim(),
    address2: address2.trim(),
    phoneNumber: phoneNumber.trim(),
    email: email.trim()
  }

  try {
    // ★★★ tryブロックはDB操作のみを囲む ★★★
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        key: 'phoenix_address',
        value: JSON.stringify(companyInfo)
      })
      .select('value')
      .single()

    if (error) {
      console.error('❌ 自社情報更新エラー:', error)
      return redirect('/admin/company-info?error=update_failed')
    }

    console.log('✅ 自社情報更新成功:', data.value)

  } catch (error) {
    console.error('❌ Server Action 予期せぬエラー:', error)
    return redirect('/admin/company-info?error=server_error')
  }

  // ★★★ 成功時の処理はtryの外側で行う ★★★
  revalidatePath('/admin/company-info')
  return redirect('/admin/company-info?success=updated')
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
        text: '自社情報を正常に更新しました'
      }
    }

    switch (error) {
      case 'contact_name_required':
        return {
          type: 'error' as const,
          text: '担当者名を入力してください'
        }
      case 'postal_code_required':
        return {
          type: 'error' as const,
          text: '郵便番号を入力してください'
        }
      case 'address1_required':
        return {
          type: 'error' as const,
          text: '住所（都道府県・市区町村）を入力してください'
        }
      case 'phone_number_required':
        return {
          type: 'error' as const,
          text: '電話番号を入力してください'
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
function CurrentInfoDisplay({ companyInfo }: { companyInfo: CompanyInfo }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">現在の自社情報</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">担当者名</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.contactName || '未設定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">会社名</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.companyName || '未設定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">郵便番号</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.postalCode || '未設定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">住所1（都道府県・市区町村）</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.address1 || '未設定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">住所2（番地・建物名）</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.address2 || '未設定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">電話番号</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.phoneNumber || '未設定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">メールアドレス</p>
            <p className="text-lg font-medium text-gray-900">{companyInfo.email || '未設定'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 自社情報更新フォームコンポーネント
function CompanyInfoUpdateForm({ currentCompanyInfo }: { currentCompanyInfo: CompanyInfo }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">自社情報の更新</h2>
        <p className="text-sm text-gray-600 mt-1">送り状に記載される自社情報を設定してください</p>
      </div>
      <div className="p-6">
        <form action={updateCompanyInfoAction} className="space-y-6">
          {/* 担当者名 */}
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
              担当者名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="contactName"
              name="contactName"
              defaultValue={currentCompanyInfo.contactName}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: 山田太郎"
            />
          </div>

          {/* 会社名 */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              会社名
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              defaultValue={currentCompanyInfo.companyName}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: 株式会社サンプル"
            />
          </div>

          {/* 郵便番号 */}
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
              郵便番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              defaultValue={currentCompanyInfo.postalCode}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: 123-4567"
            />
          </div>

          {/* 住所1 */}
          <div>
            <label htmlFor="address1" className="block text-sm font-medium text-gray-700 mb-2">
              住所1（都道府県・市区町村） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="address1"
              name="address1"
              defaultValue={currentCompanyInfo.address1}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: 東京都渋谷区"
            />
          </div>

          {/* 住所2 */}
          <div>
            <label htmlFor="address2" className="block text-sm font-medium text-gray-700 mb-2">
              住所2（番地・建物名）
            </label>
            <input
              type="text"
              id="address2"
              name="address2"
              defaultValue={currentCompanyInfo.address2}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: 1-2-3 サンプルビル4F"
            />
          </div>

          {/* 電話番号 */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              defaultValue={currentCompanyInfo.phoneNumber}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: 03-1234-5678"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={currentCompanyInfo.email}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C]"
              placeholder="例: info@example.com"
            />
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
              自社情報を更新
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 自社情報について</h3>
      <ul className="text-blue-800 text-sm space-y-2">
        <li>• ここで設定した情報は、FedEx送り状の差出人情報として使用されます</li>
        <li>• 担当者名、郵便番号、住所1、電話番号は必須項目です</li>
        <li>• 正確な情報を入力することで、配送トラブルを防げます</li>
        <li>• 変更は即座に適用され、次回作成される送り状から反映されます</li>
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
export default async function CompanyInfoPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const { companyInfo, error } = await getCurrentCompanyInfo()

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">自社情報設定</h1>
          <p className="text-gray-600">送り状に記載される自社情報を管理します</p>
        </div>
      </div>

      {/* メッセージ表示 */}
      <MessageDisplay searchParams={searchParams} />

      {/* エラー表示（データ取得エラーの場合） */}
      {error && <ErrorDisplay error={error} />}

      {/* 現在の設定表示 */}
      <CurrentInfoDisplay companyInfo={companyInfo} />

      {/* 自社情報更新フォーム */}
      <CompanyInfoUpdateForm currentCompanyInfo={companyInfo} />

      {/* 注意事項 */}
      <NoticeSection />
    </div>
  )
}
