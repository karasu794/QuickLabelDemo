'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import QuotePickerShared from '@/components/quotes/QuotePickerShared'
import type { FedExRate as UiRate } from '@/components/FedExQuoteResults'
import { useShippingFormStore } from '@/store/shippingFormStore'
import { isServiceStepEnabled } from '@/lib/config/featureFlags'
import { useQuoteJobPolling } from '@/lib/polling/useQuoteJobPolling'
import { getDeclaredValueCap, getInsuranceHelpUrl } from '@/lib/insurance/caps'

export default function ServiceStepPage() {
  const router = useRouter()
  const packages = useShippingFormStore((s) => s.packages)
  const shipperInfo = useShippingFormStore((s) => s.shipperInfo)
  const recipientInfo = useShippingFormStore((s) => s.recipientInfo)
  const selectedRate = useShippingFormStore((s) => s.selectedRate)
  const setSelectedRate = useShippingFormStore((s) => s.setSelectedRate)
  const markStepCompleted = useShippingFormStore((s) => s.markStepCompleted)

  const [rates, setRates] = useState<UiRate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const hasRequestedRef = useRef(false)
  const [pollingJobId, setPollingJobId] = useState<string | null>(null)
  const poll = useQuoteJobPolling<{ rates?: UiRate[] }>(pollingJobId, Boolean(pollingJobId))

  // 追加入力フィールド（サービス別見積専用）
  const [isResidential, setIsResidential] = useState(false)
  const [insuranceEnabled, setInsuranceEnabled] = useState(false)
  const [declaredValue, setDeclaredValue] = useState<number | ''>('')
  const [shipDate, setShipDate] = useState<string>(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })

  const pkgCount = packages?.length || 0

  // 自動見積りは廃止。フラグ/既選択のチェックのみ維持
  useEffect(() => {
    if (!isServiceStepEnabled() || selectedRate) {
      router.replace('/shipping/new/review')
    }
  }, [router, selectedRate])

  // 上限警告の計算（packages は store 済み前提）
  const primaryPackagingType = ((packages && packages[0] && (packages[0] as { type?: string }).type) || 'YOUR_PACKAGING') as string
  const declaredCapJPY = getDeclaredValueCap(primaryPackagingType)
  const showCapWarning = Boolean(insuranceEnabled && Number(declaredValue || 0) > declaredCapJPY)

  // ポーリング結果が届いたら反映
  useEffect(() => {
    if (!poll) return
    if (poll.error) {
      setError(poll.error)
      setIsLoading(false)
      return
    }
    if (poll.loading) {
      setIsLoading(true)
      return
    }
    const r = (poll.data as { rates?: Array<unknown> } | null)?.rates
    if (Array.isArray(r) && r.length > 0) {
      type IncomingRate = {
        serviceType?: string
        code?: string
        serviceName?: string
        displayName?: string
        totalNetFedExCharge?: number | string
        amount?: number | string
        deliveryDate?: string
        deliveryDayOfWeek?: string
      }
      const mapped = (r as IncomingRate[]).map((x) => ({
        serviceType: x.serviceType || x.code || 'UNKNOWN',
        totalNetFedExCharge: String(x.totalNetFedExCharge ?? x.amount ?? 0),
        deliveryDate: x.deliveryDate,
        deliveryDayOfWeek: x.deliveryDayOfWeek,
        packagingType: 'YOUR_PACKAGING',
        rateType: 'ACCOUNT',
        breakdown: (x as any).breakdown,
      })) as UiRate[]
      setRates(mapped)
      setIsLoading(false)
    }
  }, [poll])

  const handleSelect = (rate: UiRate) => {
    setSelectedRate({
      serviceName: rate.serviceType,
      amount: Number(rate.totalNetFedExCharge || '0'),
      currency: 'JPY',
      serviceType: rate.serviceType,
    })
    markStepCompleted('/shipping/new/service')
    router.push('/shipping/new/review')
  }

  // 手動見積り実行
  async function runFetch() {
    try {
      if (isLoading) return
      if (!Array.isArray(packages) || packages.length === 0) {
        setRates([])
        return
      }
      // E2E/開発用モック: cookie `core-mode=mock` または env `CORE_MODE=mock` の場合は即時ダミーレートを表示
      try {
        const mockEnabled = (typeof document !== 'undefined' && /(?:^|;\s*)core-mode=mock(?:;|$)/i.test(document.cookie)) || String(process.env.CORE_MODE || '').toLowerCase() === 'mock'
        if (mockEnabled) {
          setIsLoading(true)
          const mockRates: UiRate[] = [
            {
              serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
              totalNetFedExCharge: '12345',
              deliveryDate: new Date().toISOString().slice(0,10),
              deliveryDayOfWeek: 'Fri',
              packagingType: 'YOUR_PACKAGING',
              rateType: 'ACCOUNT',
              breakdown: {
                baseRate: 15000,
                volumeDiscount: 3000,
                importProcessingSurcharge: 100 as any,
                fuelSurcharge: 500,
                peakSurcharge: 0,
                residentialSurcharge: 0,
                deliveryAreaSurcharge: 0,
                additionalHandlingSurcharge: 0,
                otherSurcharge: 0,
              } as any,
            }
          ]
          setRates(mockRates)
          setIsLoading(false)
          return
        }
      } catch {}

      hasRequestedRef.current = true
      setError(undefined)
      setRates([])
      setPollingJobId(null)
      setIsLoading(true)

      // build quoteParams according to zod schema
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')

      const baseParams = {
        originCountry: (shipperInfo?.countryCode || 'JP').toUpperCase(),
        originPostalCode: shipperInfo?.postalCode || '',
        originStateCode: shipperInfo?.stateCode || '',
        originCityName: shipperInfo?.cityName || '',
        destinationCountry: (recipientInfo?.countryCode || 'US').toUpperCase(),
        destinationPostalCode: recipientInfo?.postalCode || '',
        destinationStateCode: recipientInfo?.stateCode || '',
        destinationCityName: recipientInfo?.cityName || '',
        shipDate: `${yyyy}-${mm}-${dd}`,
        originSelected: true,
        destinationSelected: true,
        isResidential: Boolean(recipientInfo?.isResidential),
        higherInsurance: (packages || []).some(p => Number(p.declaredValue || '0') > 0),
      }

      const dv = Number(declaredValue || 0)
      const qp = {
        ...baseParams,
        isResidential: Boolean(isResidential),
        higherInsurance: Boolean(insuranceEnabled && dv > 0),
        declaredValue: Math.max(0, dv),
        currency: 'JPY',
        shipDate: shipDate || baseParams.shipDate,
      }

      const normalizedPackages = packages.map((p: { type?: string; packagingType?: string; weight?: string; length?: string; width?: string; height?: string; declaredValue?: string }, i: number) => ({
        id: i + 1,
        packagingType: p.type || p.packagingType || 'YOUR_PACKAGING',
        weight: Number(p.weight || '0'),
        length: Number(p.length || '0'),
        width: Number(p.width || '0'),
        height: Number(p.height || '0'),
        declaredValue: Number(p.declaredValue || '0'),
      }))

      if (pkgCount >= 2) {
        // MPS 即時計算
        const body = { quoteParams: qp, packages: normalizedPackages }
        const resp = await fetch('/api/quote/mps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!resp.ok) throw new Error(`MPS_QUOTE_${resp.status}`)
        const json: { quotes?: Array<any>; rates?: Array<any> } = await resp.json()
        // Prefer normalized quotes if present
        let mapped: UiRate[] = []
        if (Array.isArray(json?.quotes) && json.quotes.length > 0) {
          mapped = json.quotes.map((q: any) => ({
            serviceType: String(q?.service || 'UNKNOWN'),
            totalNetFedExCharge: String(q?.total ?? 0),
            deliveryDate: q?.eta || undefined,
            deliveryDayOfWeek: undefined,
            packagingType: 'YOUR_PACKAGING',
            rateType: 'ACCOUNT',
            breakdown: (q as any).breakdown,
          })) as UiRate[]
        } else {
          type IncomingRate = {
            serviceType?: string
            code?: string
            serviceName?: string
            displayName?: string
            totalNetFedExCharge?: number | string
            amount?: number | string
            deliveryDate?: string
            deliveryDayOfWeek?: string
          }
          mapped = ((json?.rates || []) as IncomingRate[]).map((r) => ({
            serviceType: r.serviceType || r.code || 'UNKNOWN',
            totalNetFedExCharge: String(r.totalNetFedExCharge ?? r.amount ?? 0),
            deliveryDate: r.deliveryDate,
            deliveryDayOfWeek: r.deliveryDayOfWeek,
            packagingType: 'YOUR_PACKAGING',
            rateType: 'ACCOUNT',
            breakdown: (r as any).breakdown,
          })) as UiRate[]
        }
        setRates(mapped)
        setIsLoading(false)
        return
      }

      // 単品はジョブ作成→ポーリング
      const body = { quoteParams: qp, packages: normalizedPackages }
      const resp = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!resp.ok) throw new Error(`QUOTE_${resp.status}`)
      const j: { jobId?: string; quotes?: any[] } = await resp.json().catch(() => ({}) as any)
      if (Array.isArray(j?.quotes) && j.quotes.length > 0) {
        // If quotes are immediately available, shortcut display
        const mapped = j.quotes.map((q: any) => ({
          serviceType: String(q?.service || 'UNKNOWN'),
          totalNetFedExCharge: String(q?.total ?? 0),
          deliveryDate: q?.eta || undefined,
          deliveryDayOfWeek: undefined,
          packagingType: 'YOUR_PACKAGING',
          rateType: 'ACCOUNT',
        })) as UiRate[]
        setRates(mapped)
        setIsLoading(false)
        return
      }
      const jobId = j?.jobId as string | undefined
      if (!jobId) throw new Error('no jobId')
      setPollingJobId(jobId)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'failed to fetch rates'
      console.error(e)
      setError(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl" data-test="service-step-root">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>サービス別見積</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">内容品と荷姿に基づいて、利用可能なFedExサービスの料金を表示します。サービスを選択してください。</p>
        </CardContent>
      </Card>

      {/* 追加コントロール */}
      <div className="mb-6">
        {/* 個人宅配送 */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="svc-is-residential"
            data-test="svc-is-residential"
            checked={isResidential}
            onChange={(e) => setIsResidential(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="svc-is-residential" className="text-sm">個人宅への配送の場合はチェックを入れて下さい</label>
        </div>

        {/* 申告価額（有効化→金額入力） */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="svc-insurance-enabled"
              data-test="svc-insurance-enabled"
              checked={insuranceEnabled}
              onChange={(e) => setInsuranceEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="svc-insurance-enabled" className="text-sm">申告価額による補償上限の設定</label>
            <a className="text-xs text-blue-600 hover:underline" href={getInsuranceHelpUrl()} target="_blank" rel="noreferrer">詳しく</a>
          </div>
          {insuranceEnabled && (
            <div className="mt-2">
              <input
                id="svc-declared-value"
                data-test="svc-declared-value"
                type="number"
                min="0"
                step="1"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-64 rounded-md border px-3 py-2"
                placeholder="0"
              />
              <div className="text-xs text-gray-600 mt-1">荷物の価値を申告し、補償上限を設定します。申告額に応じて追加料金がかかります。通貨: JPY</div>
              {showCapWarning && (
                <div className="mt-2 text-xs text-red-600" data-test="svc-declared-cap-warning">
                  この梱包タイプの上限（¥{declaredCapJPY.toLocaleString()}）を超えています。申告額を下げるか梱包を変更してください。
                </div>
              )}
            </div>
          )}
        </div>

        {/* 出荷日 */}
        <div className="mt-4">
          <label className="block text-sm mb-1" htmlFor="svc-ship-date">希望出荷日はいつですか？</label>
          <input
            id="svc-ship-date"
            data-test="svc-ship-date"
            type="date"
            value={shipDate}
            min={new Date().toISOString().slice(0,10)}
            onChange={(e) => setShipDate(e.target.value)}
            className="w-52 rounded-md border px-3 py-2"
          />
        </div>

        {/* CTA（中央配置） */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            data-test="svc-show-quote"
            onClick={() => { runFetch() }}
            className="px-8 py-3 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600"
            disabled={Boolean(insuranceEnabled && Number(declaredValue || 0) < 0)}
          >
            見積もりを表示
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 mb-4" data-test="service-error">見積の取得に失敗しました。時間を置いてお試しください。</div>
      )}

      {!error && (
        <QuotePickerShared
          rates={rates}
          isLoading={isLoading}
          error={undefined}
          onSelectRate={handleSelect}
        />
      )}

      {!isLoading && !error && (!rates || rates.length === 0) && (
        <div className="text-gray-600" data-test="service-empty">表示できる見積がありません。</div>
      )}

      <div className="mt-8">
        <Link href="/shipping/new/contents" className="text-blue-600 hover:underline">← 内容品の詳細に戻る</Link>
      </div>
    </div>
  )
}


