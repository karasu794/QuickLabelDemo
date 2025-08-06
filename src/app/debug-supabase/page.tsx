'use client'

import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Activity, Database, Zap, AlertCircle, Shield } from 'lucide-react'
import { runComprehensiveDiagnosis, type ConnectionDiagnosis } from '@/lib/supabase/diagnostics'

export default function SupabaseDebugPage() {
  const [diagnosisData, setDiagnosisData] = useState<ConnectionDiagnosis | null>(null)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)
  const [serverDiagnosis, setServerDiagnosis] = useState<any>(null)
  const [serverDiagnosisLoading, setServerDiagnosisLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  // 現在のユーザー情報を取得
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[DEBUG-PAGE] Current session:', session)
        setSessionInfo(session)
        setCurrentUser(session?.user || null)
      } catch (error) {
        console.error('[DEBUG-PAGE] Failed to get session:', error)
      }
    }
    getCurrentUser()
  }, [])

  // クライアントサイド診断の実行
  const runClientDiagnosis = async () => {
    setDiagnosisLoading(true)
    try {
      console.log('[DEBUG-PAGE] 🩺 Running client-side diagnosis...')
      const diagnosis = await runComprehensiveDiagnosis(supabase, currentUser?.id)
      setDiagnosisData(diagnosis)
      console.log('[DEBUG-PAGE] 🩺 Client diagnosis completed:', diagnosis)
    } catch (error) {
      console.error('[DEBUG-PAGE] 🚨 Client diagnosis failed:', error)
    } finally {
      setDiagnosisLoading(false)
    }
  }

  // サーバーサイド診断の実行
  const runServerDiagnosis = async () => {
    setServerDiagnosisLoading(true)
    try {
      console.log('[DEBUG-PAGE] 🩺 Running server-side diagnosis...')
      const url = currentUser?.id 
        ? `/api/debug/supabase-diagnosis?userId=${currentUser.id}`
        : '/api/debug/supabase-diagnosis'
      const response = await fetch(url)
      const result = await response.json()
      setServerDiagnosis(result)
      console.log('[DEBUG-PAGE] 🩺 Server diagnosis completed:', result)
    } catch (error) {
      console.error('[DEBUG-PAGE] 🚨 Server diagnosis failed:', error)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ページヘッダー */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="h-7 w-7 text-blue-600" />
                Supabase接続診断システム
              </h1>
              <p className="text-gray-600 mt-2">
                認証・接続問題の根本原因特定のための包括的診断ツール
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">診断対象環境</div>
              <div className="font-semibold text-blue-600">
                {process.env.NODE_ENV === 'production' ? 'Vercel本番' : 'ローカル開発'}
              </div>
            </div>
          </div>
        </div>

        {/* 緊急アクセス警告 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">緊急診断モード</h3>
              <p className="text-yellow-800 text-sm mt-1">
                管理者権限問題により、認証不要で診断機能にアクセスしています。
                問題解決後は /admin/debug に統合予定です。
              </p>
            </div>
          </div>
        </div>

        {/* 現在のユーザー状態 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            現在の認証状態
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-medium text-gray-700 mb-2">ユーザー情報</div>
              {currentUser ? (
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">ID:</span> {currentUser.id}</div>
                  <div><span className="font-medium">Email:</span> {currentUser.email}</div>
                  <div><span className="font-medium">最終ログイン:</span> {new Date(currentUser.last_sign_in_at).toLocaleString('ja-JP')}</div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">未ログイン</div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-medium text-gray-700 mb-2">セッション情報</div>
              {sessionInfo ? (
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">トークン:</span> {sessionInfo.access_token ? '存在' : '不明'}</div>
                  <div><span className="font-medium">有効期限:</span> {new Date(sessionInfo.expires_at * 1000).toLocaleString('ja-JP')}</div>
                  <div><span className="font-medium">プロバイダー:</span> {sessionInfo.user?.app_metadata?.provider || '不明'}</div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">セッション不明</div>
              )}
            </div>
          </div>
        </div>

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
                disabled={diagnosisLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {diagnosisLoading ? '実行中...' : 'クライアント診断'}
              </button>
              
              <button
                onClick={runServerDiagnosis}
                disabled={serverDiagnosisLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Database className="h-4 w-4" />
                {serverDiagnosisLoading ? '実行中...' : 'サーバー診断'}
              </button>
              
              <button
                onClick={runComprehensiveDiagnosisTest}
                disabled={diagnosisLoading || serverDiagnosisLoading}
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
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-2">環境情報:</div>
                    <div className="bg-gray-50 p-2 rounded font-mono">
                      {diagnosisData.environment.vercelEnv || 'ローカル'} / {diagnosisData.environment.vercelRegion || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="text-xs">
                    <div className="font-medium text-gray-700 mb-2">ネットワーク遅延:</div>
                    <div className="bg-gray-50 p-2 rounded space-y-1">
                      <div>REST: {diagnosisData.latency.rest}ms</div>
                      <div>Auth: {diagnosisData.latency.auth}ms</div>
                      <div>Realtime: {diagnosisData.latency.realtime}ms</div>
                    </div>
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
                      <div className={`p-3 rounded ${serverDiagnosis.diagnosis.rls?.adminAccess?.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="font-medium">管理者アクセス</div>
                        <div>{serverDiagnosis.diagnosis.rls?.adminAccess?.success ? '✅ 成功' : '❌ 失敗'}</div>
                        <div className="text-xs text-gray-600">{serverDiagnosis.diagnosis.rls?.adminAccess?.duration}ms</div>
                        {serverDiagnosis.diagnosis.rls?.adminAccess?.error && (
                          <div className="text-xs text-red-600 mt-1">{serverDiagnosis.diagnosis.rls?.adminAccess?.error}</div>
                        )}
                      </div>
                      
                      <div className={`p-3 rounded ${serverDiagnosis.diagnosis.rls?.userAccess?.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="font-medium">ユーザーアクセス</div>
                        <div>{serverDiagnosis.diagnosis.rls?.userAccess?.success ? '✅ 成功' : '❌ 失敗'}</div>
                        <div className="text-xs text-gray-600">{serverDiagnosis.diagnosis.rls?.userAccess?.duration}ms</div>
                        {serverDiagnosis.diagnosis.rls?.userAccess?.error && (
                          <div className="text-xs text-red-600 mt-1">{serverDiagnosis.diagnosis.rls?.userAccess?.error}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-2">RLSポリシー:</div>
                      <div className="bg-gray-50 p-2 rounded">
                        {serverDiagnosis.diagnosis.rls?.rls?.policyCount || 0}個のポリシーが設定されています
                      </div>
                    </div>

                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-2">サーバー環境:</div>
                      <div className="bg-gray-50 p-2 rounded space-y-1">
                        <div>Node: {serverDiagnosis.diagnosis.server?.nodeVersion}</div>
                        <div>Platform: {serverDiagnosis.diagnosis.server?.platform}</div>
                        <div>Vercel Region: {serverDiagnosis.diagnosis.server?.vercelRegion || 'N/A'}</div>
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

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            この診断ページは緊急対応用です。問題解決後は管理者ページに統合されます。
          </p>
          <p className="mt-1">
            診断結果はブラウザコンソールでも詳細確認できます。
          </p>
        </div>
      </div>
    </div>
  )
}