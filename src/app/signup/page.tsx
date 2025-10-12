'use client'

import { Suspense } from 'react'
import SignUpForm from './SignUpForm'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-gray-900">アカウント作成</h2>
            <p className="text-sm text-gray-600">
              既にアカウントをお持ちですか？{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">ログイン</Link>
            </p>
          </div>
          <Suspense fallback={<div className="text-center text-gray-600">読み込み中...</div>}>
            <SignUpForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}