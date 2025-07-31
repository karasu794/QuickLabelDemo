'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // 管理者アプリのデフォルトページは管理画面にリダイレクト
    router.replace('/admin')
  }, [router])

  return null
}