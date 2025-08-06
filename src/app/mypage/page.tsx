'use client'

// 動的レンダリングを強制してキャッシュを回避
export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mypage/profile')
  }, [router])

  return null // リダイレクト処理中に何も表示しない
}