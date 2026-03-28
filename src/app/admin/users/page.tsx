import { createServiceRoleClient } from '@/lib/supabase/server'
import UserTableSwitcher from './UserTableSwitcher'
import { maskEmail } from '@/lib/demo/maskEmail'

// ユーザーデータの型定義
export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  created_at: string | null
}

export default async function UsersPage() {
  // Service Role Keyクライアントを使用して全ユーザーデータにアクセス
  const supabase = createServiceRoleClient()
  
  console.log('管理者ページ: Service Role Keyクライアント使用開始')

  try {
    // profilesテーブルから全ユーザーを取得
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_name, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles:', error)
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">ユーザー情報の取得に失敗しました。</p>
          <p className="text-red-600 text-sm mt-2">エラー: {error.message}</p>
        </div>
      )
    }

    console.log(`管理者ページ: ${profiles?.length || 0}件のユーザー情報を取得`)

    // データを型安全にキャスト
    const users: UserProfile[] = (profiles || []).map((p: any) => ({
      ...p,
      email: maskEmail(p.email),
    }))

    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">会員管理</h1>
            <p className="mt-2 text-gray-600">登録済み会員の情報を管理できます</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-2">
            <div className="text-right">
              <p className="text-sm text-gray-500">総会員数</p>
              <p className="text-2xl font-bold text-purple-600">{users.length}名</p>
            </div>
          </div>
        </div>

        {/* サーバーサイド接続確認メッセージ */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            ✅ Service Role Key経由でSupabaseに接続済み ({users.length}件のプロフィールを取得)
          </p>
        </div>

        {/* 切り替え可能なユーザーテーブル */}
        <UserTableSwitcher users={users} />
      </div>
    )
  } catch (error) {
    console.error('管理者ページでのエラー:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">ページの読み込み中にエラーが発生しました。</p>
        <p className="text-red-600 text-sm mt-2">
          エラー: {error instanceof Error ? error.message : '不明なエラー'}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Service Role Keyが正しく設定されているか確認してください。
        </p>
      </div>
    )
  }
} 