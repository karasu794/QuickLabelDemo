'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package } from 'lucide-react'
import { useShippingFormStore, useWaitForHydration } from '@/store/shippingFormStore'
import { isServiceStepEnabled } from '@/lib/config/featureFlags'
import { isUS } from '@/lib/utils/isUS'
import ContentsForm from '@/components/contents/ContentsForm'
import type { ContentsFormValue } from '@/components/contents/validation'

export default function HtsStepPage() {
  const router = useRouter()
  const { isReady } = useWaitForHydration()
  const recipientInfo = useShippingFormStore((s) => s.recipientInfo)
  const { items, setItems } = useShippingFormStore()
  const selectedRate = useShippingFormStore((s) => s.selectedRate)

  const isUSDest = isUS(recipientInfo?.countryCode)
  const pathname = usePathname()

  // 非USは通常のcontentsへ
  useEffect(() => {
    if (!isReady) return
    const cc = recipientInfo?.countryCode
    if (!cc) return
    if (!isUSDest && pathname.endsWith('/contents/hts')) {
      router.replace('/shipping/new/contents')
    }
  }, [isReady, isUSDest, recipientInfo?.countryCode, pathname, router])

  // ここでのサジェストは将来の拡張対象。現STEPではフォーム側に寄せず維持しない。

  const handlePrev = () => {
    router.push('/shipping/new/packages')
  }

  const onSubmit = async (values: ContentsFormValue) => {
    // ユーザー入力を store に反映
    setItems(values.items as unknown as typeof items)
    try {
      const markStepCompleted = useShippingFormStore.getState().markStepCompleted
      markStepCompleted?.('/shipping/new/contents')
    } catch {}
    // USでは HTS 必須: Items の中に htsCode を必須として schema が検証
    const next = (isServiceStepEnabled() && !selectedRate) ? '/shipping/new/service' : '/shipping/new/review'
    router.push(next)
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">内容品情報 - HTS（米国宛てのみ）</h1>
            <p className="text-gray-600">HTSコードを入力してください（米国宛てのみ）</p>
          </div>

          <Card>
            <CardHeader className="bg-green-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                内容品情報（HTS）
              </CardTitle>
            </CardHeader>
          <CardContent className="p-6">
              <ContentsForm mode="hts" defaultValues={{ items: (items as unknown as any) }} onSubmit={onSubmit} />
              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={handlePrev}>戻る</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}


