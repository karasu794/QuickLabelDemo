import { createServiceRoleClient } from '@/lib/supabase/server'

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

    return (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">会員管理</h1>
          <div className="text-sm text-gray-500">
            総会員数: {profiles?.length || 0}名
          </div>
        </div>

        {/* サーバーサイド接続確認メッセージ */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            ✅ Service Role Key経由でSupabaseに接続済み ({profiles?.length || 0}件のプロフィールを取得)
          </p>
        </div>

      {/* ユーザーテーブル */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  担当者名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  会社名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profiles && profiles.length > 0 ? (
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ja-JP') : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    登録済みのユーザーはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">総会員数</h3>
          <p className="text-3xl font-bold text-purple-600">{profiles?.length || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">企業会員</h3>
          <p className="text-3xl font-bold text-blue-600">
            {profiles?.filter(p => p.company_name).length || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">個人会員</h3>
          <p className="text-3xl font-bold text-green-600">
            {profiles?.filter(p => !p.company_name).length || 0}
          </p>
        </div>
      </div>
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