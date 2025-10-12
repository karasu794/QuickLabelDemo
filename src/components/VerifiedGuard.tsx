'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  children: React.ReactNode
}

// 認証済みだがメール未確認のユーザーを /unverified に誘導するガード
export default function VerifiedGuard({ children }: Props) {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()

  useEffect(() => {
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


