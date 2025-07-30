'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mypage/profile')
  }, [router])

  return null // リダイレクト処理中に何も表示しない
}