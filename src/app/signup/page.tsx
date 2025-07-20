'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SignUpForm from './SignUpForm'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            アカウント作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            既にアカウントをお持ちですか？{' '}
            <Suspense fallback={<span>ログイン</span>}>
              <LoginLink />
            </Suspense>
          </p>
        </div>
        <Suspense fallback={<div className="text-center">読み込み中...</div>}>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  )
}

function LoginLink() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to')
  const loginUrl = redirectTo ? `/login?redirect_to=${encodeURIComponent(redirectTo)}` : '/login'
  
  return (
    <a href={loginUrl} className="font-medium text-indigo-600 hover:text-indigo-500">
      ログイン
    </a>
  )
} 