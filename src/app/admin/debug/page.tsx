'use client'

import { useAuth } from '@/hooks/useAuth'
import { User, Shield, Database, AlertCircle } from 'lucide-react'

export default function AdminDebugPage() {
  const { user, profile, loading, isAuthenticated, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Database className="h-6 w-6" />
          管理者設定デバッグ
        </h1>
        
        {/* 認証状態 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            認証状態
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700">ログイン状態:</span>
              <span className={`px-2 py-1 rounded-full text-sm ${
                isAuthenticated 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isAuthenticated ? '✅ ログイン済み' : '❌ 未ログイン'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700">管理者権限:</span>
              <span className={`px-2 py-1 rounded-full text-sm ${
                isAdmin 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isAdmin ? '✅ 管理者' : '❌ 一般ユーザー'}
              </span>
            </div>
          </div>
        </div>

        {/* ユーザー情報 */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ユーザー情報</h2>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">ユーザーID:</span>
                <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {user.id}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">メールアドレス:</span>
                <span className="ml-2">{user.email}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">メール確認済み:</span>
                <span className="ml-2">
                  {user.email_confirmed_at ? '✅ 確認済み' : '❌ 未確認'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* プロフィール情報 */}
        {profile && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プロフィール情報</h2>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">role列の値:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-mono ${
                  profile.role === 'admin' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  &quot;{profile.role || 'null'}&quot;
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">氏名:</span>
                <span className="ml-2">{profile.full_name || '未設定'}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">会社名:</span>
                <span className="ml-2">{profile.company_name || '未設定'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 管理者設定手順 */}
        {!isAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              管理者権限を設定する手順
            </h2>
            
            <div className="space-y-4 text-yellow-800">
              <div>
                <h3 className="font-semibold">1. Supabaseの管理画面にアクセス</h3>
                <p className="text-sm">プロジェクトのダッシュボードにログインしてください。</p>
              </div>
              
              <div>
                <h3 className="font-semibold">2. Table Editorを開く</h3>
                <p className="text-sm">左サイドバーから「Table Editor」をクリックしてください。</p>
              </div>
              
              <div>
                <h3 className="font-semibold">3. profilesテーブルを選択</h3>
                <p className="text-sm">テーブル一覧から「profiles」をクリックしてください。</p>
              </div>
              
              <div>
                <h3 className="font-semibold">4. 該当ユーザーを編集</h3>
                <p className="text-sm">
                  ユーザーID「<span className="font-mono bg-yellow-100 px-1 rounded">{user?.id}</span>」の行を見つけて、
                  role列を「<span className="font-mono bg-yellow-100 px-1 rounded">admin</span>」に変更してください。
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">5. 保存してページを再読み込み</h3>
                <p className="text-sm">変更を保存した後、このページをリロードしてください。</p>
              </div>
            </div>
          </div>
        )}

        {/* 成功メッセージ */}
        {isAdmin && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              管理者権限が正常に設定されています
            </h2>
            <p className="text-green-800">
              ヘッダーに「管理者ページ」リンクが表示され、管理機能にアクセスできます。
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 