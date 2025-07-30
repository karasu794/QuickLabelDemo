'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signUp } from '@/lib/supabase/client'

export default function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // ログインページへのリンクにredirect_toパラメータを含める
  const redirectTo = searchParams.get('redirect_to')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('') // エラーメッセージをクリア

    try {
      // Supabaseクライアントを使ってユーザー登録
      const { data, error } = await signUp(email, password)

      // デバッグ用：詳細ログ出力
      console.log('=== Signup Response Debug ===')
      console.log('Error:', error)
      console.log('Data:', data)
      console.log('User created:', data?.user)
      console.log('Session:', data?.session)
      console.log('===============================')

      if (error) {
        console.error('登録エラー:', error.message)
        console.error('エラー詳細:', error)
        
        // エラーの種類に応じた処理
        if (error.message.includes('User already registered') || 
            error.message.includes('already been registered') ||
            error.message.includes('already exists')) {
          // 登録済みメールアドレスの場合
          setErrorMessage('このメールアドレスは既に登録されています。ログインしてください。')
        } else if (error.message.includes('Password should be at least')) {
          // パスワード強度不足
          setErrorMessage('パスワードは6文字以上で設定してください。')
        } else if (error.message.includes('Invalid email')) {
          // 無効なメールアドレス
          setErrorMessage('有効なメールアドレスを入力してください。')
        } else {
          // その他のエラー
          setErrorMessage(`登録に失敗しました: ${error.message}`)
        }
        return
      }

      // 成功の場合
      console.log('登録成功:', data)
      
      // 確認メール送信メッセージを表示
      alert('確認メールを送信しました。メールを確認してアカウントを有効化してください。')

    } catch (error) {
      console.error('予期しないエラー:', error)
      setErrorMessage('予期しないエラーが発生しました。しばらくしてから再試行してください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email-address" className="sr-only">
            メールアドレス
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            disabled={isLoading}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'アカウント作成中...' : 'アカウント作成'}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p>パスワードは以下の条件を満たしてください：</p>
        <ul className="list-disc list-inside mt-1">
          <li>6文字以上</li>
          <li>英数字を含む</li>
        </ul>
      </div>
    </form>
  )
} 