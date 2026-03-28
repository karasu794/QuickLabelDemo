'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  children: React.ReactNode
}

// 認証済みだがメール未確認のユーザーを /unverified に誘導するガード
// デモ環境ではスキップ（Admin APIで確認済みだがセッションに反映されないケースがある）
const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

export default function VerifiedGuard({ children }: Props) {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (IS_DEMO) return // デモ環境ではメール確認ガードをスキップ
    if (loading) return
    if (!isAuthenticated) return
    const email = (user as any)?.email ?? ''
    const emailConfirmedAt = (user as any)?.email_confirmed_at ?? (user as any)?.confirmed_at ?? null
    if (!emailConfirmedAt) {
      const url = `/unverified${email ? `?email=${encodeURIComponent(email)}` : ''}`
      router.replace(url)
    }
  }, [loading, isAuthenticated, user, router])

  return <>{children}</>
}


