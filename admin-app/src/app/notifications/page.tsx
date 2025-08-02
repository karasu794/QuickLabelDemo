import { createClient } from '@supabase/supabase-js'
import NotificationClient, { Notification } from './NotificationClient'

// サービスロールキーを使用したSupabase client（サーバーサイド専用）
const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// サーバーサイドでの通知データ取得
async function getNotifications(): Promise<{ notifications: Notification[]; error?: string }> {
  try {
    console.log('🔐 管理者通知データ取得開始')

    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase環境変数が設定されていません（ビルド時など）')
      return {
        notifications: [],
        error: 'Supabase環境変数が設定されていません'
      }
    }

    // notificationsテーブルから全データを取得（新しい順）
    const supabaseAdmin = createSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 通知データ取得エラー:', error)
      throw error
    }

    console.log(`📊 取得した通知数: ${data?.length || 0}`)

    // データを型安全に変換
    const notifications: Notification[] = data?.map((item: any) => ({
      id: item.id,
      type: item.type || 'system',
      message: item.message || '',
      is_read: item.is_read || false,
      metadata: item.metadata || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
      read_at: item.read_at || undefined
    })) || []

    console.log('📈 通知統計:', {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      read: notifications.filter(n => n.is_read).length
    })

    return { notifications }

  } catch (error) {
    console.error('❌ 通知データ取得エラー:', error)
    return { 
      notifications: [], 
      error: '通知データの取得に失敗しました' 
    }
  }
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

// ローディング表示コンポーネント
function LoadingDisplay() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D148C] mx-auto mb-4"></div>
        <p className="text-gray-600">通知を読み込み中...</p>
      </div>
    </div>
  )
}

// メインページコンポーネント（サーバーコンポーネント）
export default async function NotificationsPage() {
  const { notifications, error } = await getNotifications()

  // エラーが発生した場合
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">通知一覧</h1>
          <p className="text-gray-600">システムからの通知を管理します</p>
        </div>
        <ErrorDisplay error={error} />
      </div>
    )
  }

  // 正常にデータが取得できた場合、クライアントコンポーネントに渡す
  return <NotificationClient initialNotifications={notifications} />
} 