'use client'

// /login ページ。フラグで新UIを切り替え。

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LoginForm from './LoginForm'
import LoginFormNew from './LoginFormNew'

function LoginFallback() {
  return (
    <div className="text-center p-8 text-gray-600">ログインフォームを読み込み中...</div>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to')

  const signupUrl = redirectTo ? `/signup?redirect_to=${encodeURIComponent(redirectTo)}` : '/signup'
  const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'
  const enableNew = useMemo(() => {
    if (typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_NEW_LOGIN) {
      return String(process.env.NEXT_PUBLIC_ENABLE_NEW_LOGIN).toLowerCase() === 'true'
    }
    if (typeof window !== 'undefined') {
      // ブラウザ環境の環境変数参照は難しいため、ビルド時注入前提。未設定ならfalse。
      return false
    }
    return false
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
          </div>

          <Suspense fallback={<LoginFallback />}>
            {enableNew ? <LoginFormNew /> : <LoginForm />}
          </Suspense>

          {/* デモモードではサインアップリンクを非表示 */}
          {!IS_DEMO && (
            <div className="pt-2 text-center text-sm text-gray-600">
              <span className="block mb-2">アカウントをお持ちでない方</span>
              <Link href={signupUrl} className="font-medium text-indigo-600 hover:text-indigo-500">新規登録はこちら</Link>
            </div>
          )}

          <div className="pt-2 text-center text-sm text-gray-600">
            <Link href="/forgot-password" className="underline mr-3">パスワードをお忘れですか？</Link>
            <Link href="/terms" target="_blank" rel="noreferrer" className="underline mr-3">利用規約</Link>
            <Link href="/privacy" target="_blank" rel="noreferrer" className="underline">プライバシーポリシー</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}