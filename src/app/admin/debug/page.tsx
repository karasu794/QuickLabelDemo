'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User, Shield, Database, AlertCircle, Activity, Zap } from 'lucide-react'
import { runComprehensiveDiagnosis, type ConnectionDiagnosis } from '@/lib/supabase/diagnostics'

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
  const [diagnosisData, setDiagnosisData] = useState<ConnectionDiagnosis | null>(null)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)
  const [serverDiagnosis, setServerDiagnosis] = useState<any>(null)
  const [serverDiagnosisLoading, setServerDiagnosisLoading] = useState(false)

  // プロフィール情報を取得
  useEffect(() => {
    if (user && isAuthenticated) {
      setProfileLoading(true)
      const fetchProfile = async () => {
        try {
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
        } catch (error) {
          console.error('Profile fetch error:', error)
        } finally {
          setProfileLoading(false)
        }
      }
      fetchProfile()
    } else {
      setProfile(null)
    }
  }, [user, isAuthenticated])

  // クライアントサイド診断の実行
  const runClientDiagnosis = async () => {
    if (!user) return
    
    setDiagnosisLoading(true)
    try {
      console.log('[DEBUG] 🩺 Running client-side diagnosis...')
      const diagnosis = await runComprehensiveDiagnosis(supabase, user.id)
      setDiagnosisData(diagnosis)
      console.log('[DEBUG] 🩺 Client diagnosis completed:', diagnosis)
    } catch (error) {
      console.error('[DEBUG] 🚨 Client diagnosis failed:', error)
    } finally {
      setDiagnosisLoading(false)
    }
  }

  // サーバーサイド診断の実行
  const runServerDiagnosis = async () => {
    if (!user) return
    
    setServerDiagnosisLoading(true)
    try {
      console.log('[DEBUG] 🩺 Running server-side diagnosis...')
      const response = await fetch(`/api/debug/supabase-diagnosis?userId=${user.id}`)
      const result = await response.json()
      setServerDiagnosis(result)
      console.log('[DEBUG] 🩺 Server diagnosis completed:', result)
    } catch (error) {
      console.error('[DEBUG] 🚨 Server diagnosis failed:', error)
    } finally {
      setServerDiagnosisLoading(false)
    }
  }

  // 包括的診断（クライアント + サーバー）
  const runComprehensiveDiagnosisTest = async () => {
    await Promise.all([
      runClientDiagnosis(),
      runServerDiagnosis()
    ])
  }

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

        {/* Supabase診断セクション */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Supabase接続診断
          </h2>
          
          <div className="space-y-4">
            <p className="text-blue-800 text-sm">
              Supabase接続の問題診断と詳細分析を実行します。管理者権限が表示されない問題の原因特定に使用します。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={runClientDiagnosis}
                disabled={diagnosisLoading || !user}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {diagnosisLoading ? '実行中...' : 'クライアント診断'}
              </button>
              
              <button
                onClick={runServerDiagnosis}
                disabled={serverDiagnosisLoading || !user}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Database className="h-4 w-4" />
                {serverDiagnosisLoading ? '実行中...' : 'サーバー診断'}
              </button>
              
              <button
                onClick={runComprehensiveDiagnosisTest}
                disabled={diagnosisLoading || serverDiagnosisLoading || !user}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Activity className="h-4 w-4" />
                {(diagnosisLoading || serverDiagnosisLoading) ? '実行中...' : '包括的診断'}
              </button>
            </div>

            {/* クライアント診断結果 */}
            {diagnosisData && (
              <div className="mt-6 bg-white rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  クライアント診断結果
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className={`p-3 rounded ${diagnosisData.basicConnection.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="font-medium">基本接続</div>
                    <div>{diagnosisData.basicConnection.success ? '✅ 成功' : '❌ 失敗'}</div>
                    <div className="text-xs text-gray-600">{diagnosisData.basicConnection.duration}ms</div>
                    {diagnosisData.basicConnection.error && (
                      <div className="text-xs text-red-600 mt-1">{diagnosisData.basicConnection.error}</div>
                    )}
                  </div>
                  
                  <div className={`p-3 rounded ${diagnosisData.authState.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="font-medium">認証状態</div>
                    <div>{diagnosisData.authState.success ? '✅ 有効' : '❌ 無効'}</div>
                    <div className="text-xs text-gray-600">{diagnosisData.authState.duration}ms</div>
                    {diagnosisData.authState.error && (
                      <div className="text-xs text-red-600 mt-1">{diagnosisData.authState.error}</div>
                    )}
                  </div>
                  
                  <div className={`p-3 rounded ${diagnosisData.profileQuery.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="font-medium">プロフィールクエリ</div>
                    <div>{diagnosisData.profileQuery.success ? '✅ 成功' : '❌ 失敗'}</div>
                    <div className="text-xs text-gray-600">{diagnosisData.profileQuery.duration}ms</div>
                    {diagnosisData.profileQuery.error && (
                      <div className="text-xs text-red-600 mt-1">{diagnosisData.profileQuery.error}</div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 text-xs">
                  <div className="font-medium text-gray-700 mb-2">環境情報:</div>
                  <div className="bg-gray-50 p-2 rounded font-mono">
                    {diagnosisData.environment.vercelEnv || 'ローカル'} / {diagnosisData.environment.vercelRegion || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* サーバー診断結果 */}
            {serverDiagnosis && (
              <div className="mt-6 bg-white rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  サーバー診断結果
                </h3>
                {serverDiagnosis.success ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-100 p-3 rounded">
                        <div className="font-medium">管理者アクセス</div>
                        <div>{serverDiagnosis.diagnosis.rls?.adminAccess.success ? '✅ 成功' : '❌ 失敗'}</div>
                        <div className="text-xs text-gray-600">{serverDiagnosis.diagnosis.rls?.adminAccess.duration}ms</div>
                      </div>
                      
                      <div className={`p-3 rounded ${serverDiagnosis.diagnosis.rls?.userAccess.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="font-medium">ユーザーアクセス</div>
                        <div>{serverDiagnosis.diagnosis.rls?.userAccess.success ? '✅ 成功' : '❌ 失敗'}</div>
                        <div className="text-xs text-gray-600">{serverDiagnosis.diagnosis.rls?.userAccess.duration}ms</div>
                        {serverDiagnosis.diagnosis.rls?.userAccess.error && (
                          <div className="text-xs text-red-600 mt-1">{serverDiagnosis.diagnosis.rls?.userAccess.error}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-2">RLSポリシー:</div>
                      <div className="bg-gray-50 p-2 rounded">
                        {serverDiagnosis.diagnosis.rls?.rls.policyCount || 0}個のポリシーが設定されています
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600 text-sm">
                    サーバー診断に失敗しました: {serverDiagnosis.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 