'use client'

// URL クエリに基づいてトーストを表示するユーティリティ（統一版）。

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function ToastOnQuery() {
  const params = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const verified = params.get('verified')
    const verifyError = params.get('verify_error')
    const reset = params.get('reset')

    if (verified === '1') {
      toast.success('メール認証が完了しました')
    } else if (verifyError === '1') {
      toast.error('メール認証に失敗しました。もう一度お試しください。')
    } else if (reset === '1') {
      toast.success('パスワードを更新しました。ログインしてください。')
    }

    if (verified || verifyError || reset) {
      const url = new URL(window.location.href)
      if (verified) url.searchParams.delete('verified')
      if (verifyError) url.searchParams.delete('verify_error')
      if (reset) url.searchParams.delete('reset')
      router.replace(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''))
    }
  }, [params, router])

  return null
}


