'use client'

import { useEffect, useState } from 'react'
import { useItems, useWaitForHydration, useRecipientInfo } from '@/store/shippingFormStore'
import { getCountryOptions } from '@/lib/data/locations'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Loader2 } from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'
import { isUS } from '@/lib/utils/isUS'
import ContentsForm from '@/components/contents/ContentsForm'
import type { ContentsFormValue } from '@/components/contents/validation'

export default function ContentsPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const { items, setItems } = useItems()
  const { recipientInfo } = useRecipientInfo()
  

  // US宛は HTS ページへ誘導（直リンク/国変更時の整合性確保）
  const pathname = usePathname()
  useEffect(() => {
    const cc = recipientInfo?.countryCode
    if (!isReady) return
    if (!cc) return
    if (isUS(cc) && pathname.endsWith('/contents')) {
      router.replace('/shipping/new/contents/hts')
    }
  }, [isReady, recipientInfo?.countryCode, pathname, router])

  const defaultValues: ContentsFormValue = { items: items as any }

  const handleSubmit = async (values: ContentsFormValue) => {
    // Zustandへ反映
    setItems(values.items as any)
    router.push('/shipping/new/review')
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">内容品情報</h1>
            <p className="text-gray-600">送る商品の詳細情報を入力してください</p>
        </div>

          {/* ハイドレーション待機ローディング */}
          {isLoading && (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="text-gray-600">データを読み込み中...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* フォーム本体 */}
          {isReady && (

          <Card>
            <CardHeader className="bg-green-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                内容品情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ContentsForm mode="hs" defaultValues={defaultValues} onSubmit={handleSubmit} />
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
} 