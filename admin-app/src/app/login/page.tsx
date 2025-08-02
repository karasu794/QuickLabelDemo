'use client'

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation' // TEMPORARY: Disabled
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { user, isAuthenticated, isAdmin } = useAuth()
  // const router = useRouter() // TEMPORARY: Disabled

  // 既にログイン済みの管理者はダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      // router.replace('/') // TEMPORARY: Disabled
      window.location.href = '/' // TEMPORARY: Use native redirect
    }
  }, [isAuthenticated, isAdmin]) // router removed from deps

  if (isAuthenticated && isAdmin) {
    return null
  }

  // 既にログイン済みだが管理者でない場合はエラー表示
  if (isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">アクセス拒否</h2>
            <p className="text-red-700 mb-4">管理者権限が必要です</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('🔐 管理者ログイン開始:', email)

      // Supabaseでログイン
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('❌ ログインエラー:', signInError)
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }

      if (!data.user) {
        setError('ログインに失敗しました')
        return
      }

      console.log('✅ 基本認証成功:', data.user.email)

      // ユーザーの管理者権限をチェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role !== 'admin') {
        console.error('❌ 管理者権限なし')
        await supabase.auth.signOut()
        setError('管理者権限が必要です')
        return
      }

      console.log('✅ 管理者権限確認完了')

      // MFAが有効かチェック
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find(factor => factor.factor_type === 'totp' && factor.status === 'verified')

      if (totpFactor) {
        console.log('🔐 MFA有効 - チャレンジページへリダイレクト')
        // MFAが有効な場合はチャレンジページにリダイレクト
        // router.push('/mfa-challenge') // TEMPORARY: Disabled
        window.location.href = '/mfa-challenge' // TEMPORARY: Use native redirect
      } else {
        console.log('⚠️ MFA未設定 - 設定ページへリダイレクト')
        // MFAが未設定の場合は強制的に設定ページにリダイレクト
        // router.push('/mfa-setup?required=true') // TEMPORARY: Disabled
        window.location.href = '/mfa-setup?required=true' // TEMPORARY: Use native redirect
      }

    } catch (error) {
      console.error('❌ ログインエラー:', error)
      setError('ログイン処理中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">管理者ログイン</h2>
          <p className="mt-2 text-gray-600">
            QuickLabel管理画面へのアクセス
          </p>
        </div>

        {/* ログインフォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                  placeholder="パスワードを入力"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* ログインボタン */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ログイン中...
                </div>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  管理者としてログイン
                </>
              )}
            </button>
          </div>

          {/* セキュリティ情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">🔐 セキュリティについて</h3>
            <ul className="text-blue-800 text-xs space-y-1">
              <li>• 管理者アカウントには多要素認証（MFA）が必須です</li>
              <li>• ログイン後にMFAの設定が求められます</li>
              <li>• 認証アプリ（Google Authenticator等）が必要です</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  )
}