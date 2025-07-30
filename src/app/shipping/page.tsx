'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ShippingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/shipping/new/shipper')
  }, [router])

  return null // リダイレクト処理中に何も表示しない
}