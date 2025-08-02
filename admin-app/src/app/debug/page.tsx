'use client'

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User, Shield, Database, AlertCircle } from 'lucide-react'

interface Profile {
  id: string
  role: string | null
  full_name: string | null
  company_name: string | null
}

export default function AdminDebugPage() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [hasMFA, setHasMFA] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)

  // プロフィール情報とMFAファクターを取得
  useEffect(() => {
    if (user && isAuthenticated) {
      setProfileLoading(true)
      const fetchData = async () => {
        try {
          // プロフィール取得
          const { data, error } = await supabase
            .from('profiles')
            .select('id, role, full_name, company_name')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('Profile fetch error:', error)
          } else {
            setProfile(data)
          }

          // MFAファクター取得
          if (isAdmin) {
            setMfaLoading(true)
            try {
              const { data: factors } = await supabase.auth.mfa.listFactors()
              const totpFactors = factors?.totp || []
              setMfaFactors(totpFactors)
              
              // MFA設定状況を確認
              const hasTotpFactor = totpFactors.some(factor => 
                factor.factor_type === 'totp' && factor.status === 'verified'
              )
              setHasMFA(hasTotpFactor)
            } catch (mfaError) {
              console.error('MFA fetch error:', mfaError)
              setHasMFA(false)
            } finally {
              setMfaLoading(false)
            }
          } else {
            setHasMFA(false)
            setMfaFactors([])
          }
        } catch (error) {
          console.error('Data fetch error:', error)
        } finally {
          setProfileLoading(false)
        }
      }
      fetchData()
    } else {
      setProfile(null)
      setMfaFactors([])
      setHasMFA(false)
    }
  }, [user, isAuthenticated, isAdmin])

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
            
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700">MFA設定:</span>
              <span className={`px-2 py-1 rounded-full text-sm ${
                hasMFA 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {mfaLoading ? '🔄 確認中...' : hasMFA ? '✅ 有効' : '⚠️ 未設定'}
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
        {user && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プロフィール情報</h2>
            
            {profileLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">プロフィール情報を取得中...</span>
              </div>
            ) : profile ? (
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
            ) : (
              <div className="text-gray-500">
                プロフィール情報の取得に失敗しました
              </div>
            )}
          </div>
        )}

        {/* MFAファクター情報 */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">MFAファクター情報</h2>
            
            {mfaFactors.length > 0 ? (
              <div className="space-y-3">
                {mfaFactors.map((factor, index) => (
                  <div key={factor.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">ファクターID:</span>
                        <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                          {factor.id}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">ステータス:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          factor.status === 'verified' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {factor.status}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">フレンドリー名:</span>
                        <span className="ml-2">{factor.friendly_name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">作成日時:</span>
                        <span className="ml-2">{new Date(factor.created_at).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                MFAファクターが登録されていません
              </div>
            )}
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
        {isAdmin && hasMFA && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              管理者権限とMFAが正常に設定されています
            </h2>
            <p className="text-green-800">
              セキュアな管理画面に完全にアクセス可能です。全ての管理機能を利用できます。
            </p>
          </div>
        )}

        {/* MFA未設定の警告 */}
        {isAdmin && !hasMFA && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              MFAの設定が必要です
            </h2>
            <p className="text-orange-800 mb-4">
              管理者アカウントにはセキュリティ強化のためMFA（二要素認証）の設定が必須です。
            </p>
            <button
              onClick={() => window.location.href = '/mfa-setup'}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              MFAを設定する
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 