'use client'

// URL クエリに基づいてトーストを表示するユーティリティ。

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function ToastOnQuery() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const verified = params.get('verified')
    const verifyError = params.get('verify_error')
    if (verified === '1') {
      toast.success('メール認証が完了しました')
      const url = new URL(window.location.href)
      url.searchParams.delete('verified')
      router.replace(url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''))
    } else if (verifyError === '1') {
      toast.error('メール認証に失敗しました。もう一度お試しください。')
      const url = new URL(window.location.href)
      url.searchParams.delete('verify_error')
      router.replace(url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''))
    }
  }, [params, router])

  return null
}


