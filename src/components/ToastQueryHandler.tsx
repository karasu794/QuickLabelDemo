'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function ToastQueryHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const verified = params.get('verified')
    const verifyError = params.get('verify_error')

    if (!verified && !verifyError) return

    if (verified === '1') {
      toast.success('メール確認が完了しました')
    }
    if (verifyError === '1') {
      toast.error('メール確認に失敗しました')
    }

    // クエリを消してトーストの重複表示を防ぐ
    params.delete('verified')
    params.delete('verify_error')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [pathname, router, searchParams])

  return null
}


