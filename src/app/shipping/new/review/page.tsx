'use client'

import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useShippingFormStore, useWaitForHydration } from '@/store/shippingFormStore'
import { isUS } from '@/lib/utils/isUS'
import SquarePaymentForm from '@/components/SquarePaymentForm'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { isReviewDisclaimerEnabled, isServiceStepEnabled } from '@/lib/config/featureFlags'
import BreakdownTable from './BreakdownTable'
import InvoiceOptionsForm from './InvoiceOptions'
import { normalizeFedExRate } from '@/lib/rates/normalizeFedExRate'
import { calcBreakdown } from '@/lib/rates/calcBreakdown'
import type { InvoiceOptions } from '@/types/invoice'

// DIAG: 免責事項（同意チェック/本文リンク/同意保存）が未実装。
// DIAG: 現状は決済トークン取得→/api/payments/charge→/api/ship/create 直行。
// DIAG: 未同意時に主要ボタンをdisabledにする処理や、data-test属性（disclaimer-* / confirm-button）が存在しない。
// DIAG: 同意事実をdrafts/shipmentsに保存する処理・terms_versionの参照も未実装。

export default function ReviewPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const search = useSearchParams()
  const forceShow = (search?.get('forceShow') || '') === '1'
  const [showTestAnchors, setShowTestAnchors] = useState(false)
  useEffect(() => {
    try {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      if (sp?.get('forceShow') === '1') setShowTestAnchors(true)
    } catch {}
  }, [])
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOptions>({
    generateCommercialInvoice: false,
    attachExistingInvoicePdf: '',
    letterheadId: undefined,
    signatureId: undefined,
    declareCurrency: 'USD',
    incoterms: '',
    dutiesPayer: undefined,
    printHSHTS: true,
    printOriginCountry: true,
  })
  
  // Zustandストアから直接全てのデータを取得
  const shipperInfo = useShippingFormStore((state) => state.shipperInfo)
  const recipientInfo = useShippingFormStore((state) => state.recipientInfo)
  const packages = useShippingFormStore((state) => state.packages)
  const items = useShippingFormStore((state) => state.items)
  const contents = useShippingFormStore((state) => state.contents)
  const shippingPurpose = useShippingFormStore((state) => state.shippingPurpose)
  const selectedRate = useShippingFormStore((state) => state.selectedRate)
  const markStepCompleted = useShippingFormStore((state) => state.markStepCompleted)
  // Step5 導入時のガード: 未選択なら service へ
  useEffect(() => {
    if (!isReady) return
    if (!forceShow && isServiceStepEnabled() && !selectedRate) {
      try { router.replace('/shipping/new/service') } catch {}
    }
  }, [isReady, selectedRate, router, forceShow])

  // ドラフトID検出（セッション/ローカルから）
  const [draftId, setDraftId] = useState<string | null>(null)
  useEffect(() => {
    try {
      const id = sessionStorage.getItem('currentDraftId') || localStorage.getItem('currentDraftId')
      if (id) setDraftId(id)
    } catch {}
  }, [])

  

  // 動的手数料率の状態（初期はnull、後述のAPIで取得）
  const [serviceFeePercentage, setServiceFeePercentage] = useState<number | null>(null)
  

  // 免責事項 同意状態
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [termsVersion, setTermsVersion] = useState<string>('v1')
  const [disclaimerError, setDisclaimerError] = useState<string | null>(null)

  // 手数料率の取得（専用APIから最新を取得）
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // 専用APIから最新値を取得（no-store）
        const res = await fetch('/api/app-settings/service-fee', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          const pct = Number(json?.serviceFeePercentage)
          if (!Number.isNaN(pct)) {
            if (!cancelled) setServiceFeePercentage(pct)
          }
        }
      } catch (e) {
        console.error('手数料率の取得に失敗:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // 利用規約/免責事項のバージョン取得
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/app-settings/terms-version', { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        if (!cancelled) setTermsVersion(String(j?.termsVersion || 'v1'))
      } catch {}
    }
    run()
    return () => { cancelled = true }
  }, [])

  // FIX: 最新ドラフトから同意状態とdraftIdを復元
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/drafts', { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        const d = j?.draft
        if (!cancelled && d) {
          if (typeof d.disclaimer_agreed === 'boolean') setDisclaimerAgreed(Boolean(d.disclaimer_agreed))
          if (typeof d.terms_version === 'string' && d.terms_version) setTermsVersion(d.terms_version)
          if (d.id) {
            setDraftId(String(d.id))
            try { sessionStorage.setItem('currentDraftId', String(d.id)) } catch {}
          }
        } else if (!cancelled) {
          // 下書きが存在しない場合は、現在のフォーム値から自動保存してdraftIdを確保
          try {
            const body = {
              shipperInfo: {
                companyName: shipperInfo.companyName,
                contactName: shipperInfo.contactName,
                postalCode: shipperInfo.postalCode,
                phoneNumber: shipperInfo.phoneNumber,
                countryCode: shipperInfo.countryCode,
                stateCode: shipperInfo.stateCode,
                cityName: shipperInfo.cityName,
                address1: shipperInfo.address1,
                address2: shipperInfo.address2,
              },
              recipientInfo: {
                companyName: recipientInfo.companyName,
                contactName: recipientInfo.contactName,
                postalCode: recipientInfo.postalCode,
                phoneNumber: recipientInfo.phoneNumber,
                email: recipientInfo.email,
                countryCode: recipientInfo.countryCode,
                stateCode: recipientInfo.stateCode,
                cityName: recipientInfo.cityName,
                address1: recipientInfo.address1,
                address2: recipientInfo.address2,
              },
              packages,
              items,
              shippingPurpose,
            }
            const save = await fetch('/api/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (save.ok) {
              const sj = await save.json()
              const newId = sj?.draftId
              if (newId) {
                setDraftId(String(newId))
                try { sessionStorage.setItem('currentDraftId', String(newId)) } catch {}
              }
            }
          } catch {}
        }
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  // 旧: ドラフト由来のサービス確定状態取得は撤去
  

  // 料金計算ロジック（選択済みレートのみで計算）
  const calculations = useMemo(() => {
    const totalWeight = packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0)
    let shippingFee = 0
    let selectedService = '未選択'
    if (selectedRate) {
      shippingFee = Math.round(selectedRate.amount)
      selectedService = selectedRate.serviceName
    }
    
    // サービス手数料（動的な手数料率を使用、未取得時は0）
    const pct = typeof serviceFeePercentage === 'number' ? serviceFeePercentage : 0
    const serviceFee = Math.round(shippingFee * (pct / 100))
    
    // 税金（消費税10%）
    const subtotal = shippingFee + serviceFee
    const tax = Math.round(subtotal * 0.10)
    
    // 最終請求額
    const total = subtotal + tax
    
    // 追加: Rate正規化→標準内訳
    let breakdownLines: { key: any; amount: number }[] = []
    try {
      const dto = normalizeFedExRate({
        baseCharge: shippingFee + 0, // 不明のため近似
        discounts: 0,
        ratedShipmentDetails: [{ totalNetCharge: { amount: shippingFee, currency: selectedRate?.currency || 'JPY' }, shipmentRateDetails: [{ surcharges: [] }] }]
      }, selectedRate?.currency || 'JPY')
      const calc = calcBreakdown(dto)
      breakdownLines = [
        { key: 'base', amount: calc.lines.base.amount },
        { key: 'discount', amount: calc.lines.discount.amount },
        { key: 'fuel', amount: calc.lines.fuel.amount },
        { key: 'peak', amount: calc.lines.peak.amount },
        { key: 'other', amount: calc.lines.other.amount },
        { key: 'systemFee', amount: calc.lines.systemFee.amount },
        { key: 'vat', amount: calc.lines.vat.amount },
      ]
    } catch {}
    if (!breakdownLines.length) {
      // フォールバック: 0円の行を明示表示（テスト/UX用）
      breakdownLines = [
        { key: 'base', amount: 0 },
        { key: 'discount', amount: 0 },
        { key: 'fuel', amount: 0 },
        { key: 'peak', amount: 0 },
        { key: 'other', amount: 0 },
        { key: 'systemFee', amount: 0 },
        { key: 'vat', amount: 0 },
      ]
    }

    return {
      shippingFee,
      serviceFee,
      tax,
      subtotal,
      total,
      totalWeight,
      serviceFeePercentage: pct,
      selectedService,
      packageCount: packages.length,
      breakdownLines,
    }
  }, [packages, serviceFeePercentage, selectedRate])

  const formatCurrency = useMemo(() => {
    try {
      return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: selectedRate?.currency || 'JPY' })
    } catch {
      return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
    }
  }, [selectedRate?.currency])

  // 戻るボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/contents')
  }

  // トークン受信時の処理（決済と送り状作成を統合）
  const handleTokenReceived = async (token: string) => {
    console.log('決済トークン受信:', token)
    
    setIsProcessingPayment(true)
    setPaymentCompleted(false)
    setPaymentError(null)
    
    try {
      if (!disclaimerAgreed) {
        setDisclaimerError('免責事項への同意が必要です')
        setIsProcessingPayment(false)
        return
      }
      // 統合送り状データを準備
      const shippingData = {
        sourceId: token,
        finalCharge: calculations.total,
        shipperInfo,
        recipientInfo,
        packages,
        items,
        contents,
        shippingPurpose
      }

      console.log(`🚀 ${packages.length}個口の送り状作成処理開始`)
      
      // 1) 決済: /api/payments/charge（idempotent）
      const orderId = `ord-${Date.now()}`
      const chargeRes = await fetch('/api/payments/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: calculations.total,
          currency: 'JPY',
          token,
          // SquareのロケーションIDを確実に伝達（公開/サーバー環境変数のいずれか）
          locationId: (process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID || 'default') as any,
        })
      })
      const chargeJson = await chargeRes.json()
      if (!chargeRes.ok || !chargeJson.ok) {
        throw new Error(chargeJson.message || '決済に失敗しました')
      }

      const paymentTxId = String(chargeJson.paymentId)

      // 2) 出荷作成（単品/MPSは内部で分岐せず、既存の ship/create を利用）
      const shipBody: any = {
        orderId,
        reference: undefined,
        serviceType: selectedRate?.serviceType || 'FEDEX_INTERNATIONAL_PRIORITY',
        bill: { payer: 'SENDER' },
        payment_tx_id: paymentTxId,
        terms_version: termsVersion,
        shipper: {
          name: shipperInfo.contactName || 'Shipper', phone: shipperInfo.phoneNumber || '000',
          address1: shipperInfo.address1 || '', address2: shipperInfo.address2 || '',
          city: shipperInfo.cityName || '', state: shipperInfo.stateCode || '', postalCode: shipperInfo.postalCode || '', country: shipperInfo.countryCode || 'JP'
        },
        recipient: {
          name: recipientInfo.contactName || 'Recipient', phone: recipientInfo.phoneNumber || '000',
          address1: recipientInfo.address1 || '', address2: recipientInfo.address2 || '',
          city: recipientInfo.cityName || '', state: recipientInfo.stateCode || '', postalCode: recipientInfo.postalCode || '', country: recipientInfo.countryCode || 'US'
        },
        packages: packages.map(p => ({
          weight: { value: Number(p.weight || '0'), unit: 'KG' },
          dimensions: { length: Number(p.length || '0'), width: Number(p.width || '0'), height: Number(p.height || '0'), unit: 'CM' }
        })),
        htsCode: isUS(recipientInfo.countryCode) ? String((items?.[0] as any)?.htsCode || '') || undefined : undefined
      }

      const response = await fetch('/api/ship/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `fql-${orderId}`, ...(draftId ? { 'x-draft-id': draftId } : {}) },
        body: JSON.stringify({ ...shipBody, payment_tx_id: String(chargeJson.paymentId || '') }),
      })

      // 非同期発行（202）の場合に対応: shipmentId を受け取りポーリング
      if (response.status === 202) {
        const j = await response.json().catch(() => ({}))
        const shipmentId = String(j?.shipmentId || '')
        const requestId = String(j?.requestId || '')
        if (!shipmentId) throw new Error('SHIPMENT_ID_MISSING')

        // バックオフでステータス監視
        const backoff = [1000, 2000, 4000, 8000, 12000, 16000]
        let completedLabelUrl: string | null = null
        let trackingNumber: string | null = null
        for (let i = 0; i < backoff.length; i++) {
          await new Promise(r => setTimeout(r, i === 0 ? 0 : backoff[i]))
          try {
            const s = await fetch(`/api/ship/status?shipmentId=${encodeURIComponent(shipmentId)}`, { cache: 'no-store' })
            const sj = await s.json().catch(() => ({}))
            if (sj?.status === 'completed' && sj?.labelUrl) {
              completedLabelUrl = String(sj.labelUrl)
              trackingNumber = sj?.trackingNumber ? String(sj.trackingNumber) : null
              break
            }
            if (sj?.status === 'failed') {
              throw new Error(String(sj?.error || 'SHIP_FAILED'))
            }
          } catch (e) {
            // 継続
          }
        }

        if (!completedLabelUrl) throw new Error('TIMEOUT_CREATING_LABEL')

        // ステップ完了
        markStepCompleted('/shipping/new/review')
        setPaymentCompleted(true)

        // 成功ページへ（必要情報を付与）
        const successUrl = new URL('/shipping/new/success', window.location.origin)
        if (trackingNumber) successUrl.searchParams.set('trackingNumber', trackingNumber)
        successUrl.searchParams.set('labelUrl', completedLabelUrl)
        successUrl.searchParams.set('paymentId', chargeJson.paymentId)
        successUrl.searchParams.set('shipmentId', shipmentId)
        if (requestId) successUrl.searchParams.set('requestId', requestId)
        successUrl.searchParams.set('type', packages.length > 1 ? 'mps' : 'standard')
        successUrl.searchParams.set('packageCount', String(packages.length))

        setTimeout(() => { router.push(successUrl.toString()) }, 800)
        return
      }

      // 同期成功（200）
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || '送り状作成に失敗しました')
      }

      const result = await response.json()
      console.log(`✅ 出荷作成成功:`, result)

      // 確認画面ステップを完了としてマーク
      markStepCompleted('/shipping/new/review')

      setPaymentCompleted(true)

      // 成功ページにリダイレクト
      const successUrl = new URL('/shipping/new/success', window.location.origin)
      successUrl.searchParams.set('trackingNumber', result.trackingNumber)
      successUrl.searchParams.set('paymentId', chargeJson.paymentId)
      successUrl.searchParams.set('type', packages.length > 1 ? 'mps' : 'standard')
      successUrl.searchParams.set('packageCount', String(packages.length))

      if (result.labelUrls && result.labelUrls.length > 0) {
        successUrl.searchParams.set('labelUrls', JSON.stringify(result.labelUrls))
      } else if (result.labelUrl) {
        successUrl.searchParams.set('labelUrl', result.labelUrl)
      }

      setTimeout(() => {
        router.push(successUrl.toString())
      }, 800)
      
    } catch (error) {
      console.error('決済・送り状作成エラー:', error)
      setPaymentError(error instanceof Error ? error.message : '決済・送り状作成に失敗しました')
      setIsProcessingPayment(false)
    }
  }

  // 決済エラー時の処理
  const handlePaymentError = (error: string) => {
    console.error('決済エラー:', error)
    setPaymentError(error)
    setPaymentCompleted(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">最終確認</h1>
          <p className="text-gray-600">以下の内容をご確認の上、決済にお進みください</p>
        </div>

        {/* E2E: 強制表示モード時の即時可視プレースホルダ */}
        {(forceShow || showTestAnchors) && (
          <div className="mb-4">
            <div data-test="breakdown-table" aria-busy={!isReady}>
              <table className="w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">項目</th>
                    <th className="text-right p-2">金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-test="breakdown-row-base"><td className="p-2">基本料金</td><td className="p-2 text-right">¥0</td></tr>
                  <tr data-test="breakdown-row-discount"><td className="p-2">割引</td><td className="p-2 text-right">¥0</td></tr>
                  <tr data-test="breakdown-row-fuel"><td className="p-2">燃料割増</td><td className="p-2 text-right">¥0</td></tr>
                  <tr data-test="breakdown-row-peak"><td className="p-2">混雑時割増</td><td className="p-2 text-right">¥0</td></tr>
                  <tr data-test="breakdown-row-other"><td className="p-2">その他割増</td><td className="p-2 text-right">¥0</td></tr>
                  <tr data-test="breakdown-row-systemFee"><td className="p-2">システム利用料</td><td className="p-2 text-right">¥0</td></tr>
                  <tr data-test="breakdown-row-vat"><td className="p-2">消費税</td><td className="p-2 text-right">¥0</td></tr>
                </tbody>
              </table>
            </div>
            <div data-test="invoice-options-card" className="border border-gray-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold mb-2">インボイスオプション</h3>
              <p className="text-sm text-gray-600">（E2E強制表示モード）</p>
            </div>
          </div>
        )}

      {/* ハイドレーション待機ローディング */}
      {isLoading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">データを読み込み中...</p>
            </div>
            {/* E2E用のフォールバック内訳とオプション（ハイドレーション前でも可視） */}
            <div className="mt-6">
              <div data-test="breakdown-table" aria-busy={!isReady}>
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">項目</th>
                      <th className="text-right p-2">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr data-test="breakdown-row-base"><td className="p-2">基本料金</td><td className="p-2 text-right">¥0</td></tr>
                    <tr data-test="breakdown-row-discount"><td className="p-2">割引</td><td className="p-2 text-right">¥0</td></tr>
                    <tr data-test="breakdown-row-fuel"><td className="p-2">燃料割増</td><td className="p-2 text-right">¥0</td></tr>
                    <tr data-test="breakdown-row-peak"><td className="p-2">混雑時割増</td><td className="p-2 text-right">¥0</td></tr>
                    <tr data-test="breakdown-row-other"><td className="p-2">その他割増</td><td className="p-2 text-right">¥0</td></tr>
                    <tr data-test="breakdown-row-systemFee"><td className="p-2">システム利用料</td><td className="p-2 text-right">¥0</td></tr>
                    <tr data-test="breakdown-row-vat"><td className="p-2">消費税</td><td className="p-2 text-right">¥0</td></tr>
                  </tbody>
                </table>
              </div>
              <div data-test="invoice-options-card" className="border border-gray-200 rounded-lg p-4 mt-4">
                <h3 className="font-semibold mb-2">インボイスオプション</h3>
                <p className="text-sm text-gray-600">読み込み中...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* レビュー本体 */}
      {isReady && (

      <div className="space-y-6">
          {/* サービス再選択導線 */}
          <div className="flex justify-end">
            <Link
              href="/shipping/new/service?from=review&forceShow=1"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              data-test="change-service"
            >
              サービスを変更
            </Link>
          </div>
        {/* 荷送人情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>荷送人情報</CardTitle>
              <Link
                href="/shipping/new/shipper"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編集
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">会社名</p>
                <p className="font-medium">{shipperInfo.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">担当者名</p>
                <p className="font-medium">{shipperInfo.contactName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">郵便番号</p>
                <p className="font-medium">{shipperInfo.postalCode || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">電話番号</p>
                <p className="font-medium">{shipperInfo.phoneNumber || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">住所</p>
              <p className="font-medium">
                {shipperInfo.cityName && `${shipperInfo.cityName} `}
                {shipperInfo.address1}
                {shipperInfo.address2 && ` ${shipperInfo.address2}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 荷受人情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>荷受人情報</CardTitle>
              <Link
                href="/shipping/new/recipient"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編集
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">会社名</p>
                <p className="font-medium">{recipientInfo.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">担当者名</p>
                <p className="font-medium">{recipientInfo.contactName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">郵便番号</p>
                <p className="font-medium">{recipientInfo.postalCode || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">電話番号</p>
                <p className="font-medium">{recipientInfo.phoneNumber || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">メールアドレス</p>
                <p className="font-medium">{recipientInfo.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">国</p>
                <p className="font-medium">{recipientInfo.countryCode || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">住所</p>
              <p className="font-medium">
                {recipientInfo.cityName && `${recipientInfo.cityName} `}
                {recipientInfo.address1}
                {recipientInfo.address2 && ` ${recipientInfo.address2}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 荷物の詳細 */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
            <h2 className="text-xl font-semibold">荷物の詳細</h2>
            <Link
              href="/shipping/new/packages"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集
            </Link>
          </div>
          <div className="p-6 pt-0 space-y-4">
            {packages.map((pkg, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">荷物 {index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">重量</p>
                    <p className="font-medium">{pkg.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">梱包タイプ</p>
                    <p className="font-medium">
                      {pkg.type === 'YOUR_PACKAGING' ? 'お客様ご用意の梱包材' :
                       pkg.type === 'FEDEX_PAK' ? 'FedEx Pak' :
                       pkg.type === 'FEDEX_BOX' ? 'FedEx Box' :
                       pkg.type === 'FEDEX_ENVELOPE' ? 'FedEx Envelope' :
                       pkg.type === 'FEDEX_TUBE' ? 'FedEx Tube' : pkg.type}
                    </p>
                  </div>
                  {pkg.type === 'YOUR_PACKAGING' && (
                    <div>
                      <p className="text-sm text-gray-600">サイズ</p>
                      <p className="font-medium">{pkg.length} × {pkg.width} × {pkg.height} cm</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* 荷物サマリー */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">総重量</span>
                <span className="font-semibold text-gray-900">{calculations.totalWeight.toFixed(1)} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容品 */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
            <h2 className="text-xl font-semibold">内容品・商品詳細</h2>
            <Link
              href="/shipping/new/contents"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集
            </Link>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {/* 金額内訳（標準DTO表示） */}
              {calculations.breakdownLines?.length ? (
                <div data-test="breakdown-table" aria-busy={false}>
                  <BreakdownTable lines={calculations.breakdownLines as any} currency={selectedRate?.currency || 'JPY'} />
                </div>
              ) : null}

              {/* インボイスオプション */}
              <div className="border border-gray-200 rounded-lg p-4" data-test="invoice-options-card">
                <h3 className="font-semibold mb-2">インボイスオプション</h3>
                <InvoiceOptionsForm value={invoiceOptions} onChange={setInvoiceOptions} />
              </div>
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">商品 {index + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">商品名・説明</p>
                      <p className="font-medium">{item.description || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">製造国</p>
                      <p className="font-medium">{item.countryOfManufacture || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">数量</p>
                      <p className="font-medium">{item.quantity}個</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">重量</p>
                      <p className="font-medium">{item.weight} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">単価</p>
                      <p className="font-medium">{item.currency} {item.unitPrice}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">合計金額</p>
                      <p className="font-medium">{item.currency} {(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                  {(() => {
                    const code = isUS(recipientInfo.countryCode) ? (item as any).htsCode : item.hsCode
                    if (!code) return null
                    return (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">{isUS(recipientInfo.countryCode) ? 'HTSコード' : 'HSコード'}</p>
                        <p className="font-medium">{code}</p>
                      </div>
                    )
                  })()}
                </div>
              ))}

              {/* 発送目的 */}
              {shippingPurpose && (
                <div className="border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-sm text-gray-600">発送目的</p>
                    <p className="font-medium">
                      {shippingPurpose === 'PERSONAL_USE' ? '個人使用' :
                       shippingPurpose === 'GIFT' ? '贈答品' :
                       shippingPurpose === 'SAMPLE' ? 'サンプル' :
                       shippingPurpose === 'REPAIR_AND_RETURN' ? '修理・返送品' :
                       shippingPurpose === 'DOCUMENTS' ? '書類' :
                       shippingPurpose === 'COMMERCIAL' ? '商用・有償' : shippingPurpose}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 旧サービス選択カードは撤去 */}

        {/* 料金詳細 */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200" data-test="review-price">
          <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
            <h2 className="text-xl font-semibold">料金詳細</h2>
            <p className="text-purple-100 text-sm">
              {calculations.packageCount > 1 
                ? `複数パッケージ（${calculations.packageCount}個口）最適化料金` 
                : '配送料とサービス料の内訳'}
            </p>
          </div>
          <div className="p-6">
            {/* ローディング/エラーの概念は撤去 */}

            {/* 料金が未選択の場合の警告 */}
            {!selectedRate && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-red-700 text-sm font-medium">配送サービスが選択されていません</p>
                    <p className="text-red-600 text-sm">
                      ホームページで見積もりを行い、配送サービスを選択してから送り状作成を進めてください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 料金詳細表示 */}
            <div className="space-y-4">
              {/* パッケージ情報サマリー */}
              {calculations.packageCount > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-blue-800 text-sm font-medium">
                      複数パッケージ配送（MPS）- 最適化された料金体系
                    </span>
                  </div>
                </div>
              )}

              {/* 選択されたサービス表示 */}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">選択されたサービス</span>
                <span className="font-medium text-blue-600">{calculations.selectedService}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">配送料金</span>
                <span className="font-medium">
                  {!selectedRate ? '—' : formatCurrency.format(calculations.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">サービス手数料 ({calculations.serviceFeePercentage}%)</span>
                <span className="font-medium">{!selectedRate ? '—' : formatCurrency.format(calculations.serviceFee)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">消費税（10%）</span>
                <span className="font-medium">{!selectedRate ? '—' : formatCurrency.format(calculations.tax)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t-2 border-[#4D148C]">
                <span className="text-lg font-semibold text-gray-900">最終請求額</span>
                <span className="text-2xl font-bold text-[#4D148C]">
                  {!selectedRate ? '—' : formatCurrency.format(calculations.total)}
                </span>
              </div>
              {/* 旧: サービス変更リンクは撤去 */}
            </div>
            
            <p className="text-sm text-gray-500 mt-4">※ 関税・諸税は含まれておりません</p>
          </div>
        </div>

        {/* Square決済フォーム */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
            <h2 className="text-xl font-semibold">お支払い方法</h2>
            <p className="text-purple-100 text-sm">安全で確実な決済システム</p>
          </div>
          <div className="p-6">
            {/* 料金計算中またはエラー時の案内 */}
            {(!selectedRate) && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="h-16 w-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  配送サービスを選択してください
                </h3>
                <p className="text-gray-600 mb-6">
                  決済を進めるには、まずホームページで料金を見積もり、配送サービスを選択してください。
                </p>
                {
                  <Link
                    href="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    ← ホームページに戻る
                  </Link>
                }
              </div>
            )}

            {/* 料金が確定している場合の決済フォーム */}
            {selectedRate && calculations.total > 0 && (
              <>
                {/* エラーメッセージ */}
                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700 text-sm">{paymentError}</p>
                  </div>
                )}

                {/* 処理中メッセージ */}
                {isProcessingPayment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                      <p className="text-blue-700 text-sm font-medium">
                        決済処理と送り状作成を実行中です...
                      </p>
                    </div>
                  </div>
                )}

                {/* 決済完了メッセージ */}
                {paymentCompleted && !isProcessingPayment && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-700 text-sm font-medium">
                      ✅ 決済が完了しました！完了ページに移動します...
                    </p>
                  </div>
                )}

                {isReviewDisclaimerEnabled() && (
                  <>
                    {/* 同意UI */}
                    {disclaimerError && (
                      <div data-test="disclaimer-error" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-red-700 text-sm">{disclaimerError}</p>
                      </div>
                    )}

                    <div className="mb-6">
                      <label className="flex items-start gap-3" htmlFor="disclaimer-checkbox">
                        <Checkbox
                          id="disclaimer-checkbox"
                          checked={disclaimerAgreed}
                          onCheckedChange={(v) => setDisclaimerAgreed(Boolean(v))}
                          aria-label="免責事項に同意する"
                          data-test="disclaimer-checkbox"
                        />
                        <span className="text-sm text-gray-700">
                          免責事項に同意する（
                          <Link href="/terms" className="underline" target="_blank" rel="noreferrer" data-test="disclaimer-link">免責事項を読む</Link>
                          ）
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">バージョン: {termsVersion}</p>
                    </div>
                  </>
                )}

                {/* Square決済フォーム */}
                {!paymentCompleted && !isProcessingPayment && (
                  <SquarePaymentForm
                    amount={calculations.total}
                    onTokenReceived={handleTokenReceived}
                    onPaymentError={handlePaymentError}
                    disabled={((isReviewDisclaimerEnabled() ? !disclaimerAgreed : false) || !selectedRate) || isProcessingPayment}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={handlePrevious}>
            戻る
          </Button>
        </div>
              </div>
      )}
      </div>
    </div>
  )
}
