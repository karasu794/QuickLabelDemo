'use client'

import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useWaitForHydration } from '@/store/shippingFormStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, Package } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShipmentResult {
  trackingNumber: string
  labelUrl?: string
  labelUrls?: string[] // MPS用複数ラベル
  paymentId: string
  shipmentId: string
  type?: string // 'standard' | 'mps'
  packageCount?: number
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const { isLoading, isReady } = useWaitForHydration()
  const [shipmentData, setShipmentData] = useState<ShipmentResult | null>(null)
  const requestId = searchParams.get('rid') || searchParams.get('requestId') || null
  const [isFetchingConsistency, setIsFetchingConsistency] = useState(false)
  const [consistencyError, setConsistencyError] = useState<string | null>(null)
  const [isSlow, setIsSlow] = useState(false)

  // 📄 送り状PDFの直接印刷（単一ラベル）
  const handlePrintLabel = async () => {
    const sid = shipmentData?.shipmentId
    if (!sid) return
    try {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.style.position = 'absolute'
      iframe.style.left = '-9999px'
      const pdfUrl = `/api/download-label?shipmentId=${encodeURIComponent(sid)}&action=inline`
      iframe.src = pdfUrl
      document.body.appendChild(iframe)
      iframe.onload = () => {
        try {
          if (iframe.contentWindow) {
            const cleanupIframe = () => {
              if (iframe.parentNode) document.body.removeChild(iframe)
            }
            const fallbackCleanup = setTimeout(cleanupIframe, 10000)
            iframe.contentWindow.addEventListener('afterprint', () => { clearTimeout(fallbackCleanup); cleanupIframe() })
            iframe.contentWindow.print()
          }
        } catch {
          if (iframe.parentNode) document.body.removeChild(iframe)
        }
      }
      iframe.onerror = () => { if (iframe.parentNode) document.body.removeChild(iframe) }
    } catch {}
  }

  // 📄 すべてのラベルを一括ダウンロード（MPS用）: 既存のPOSTはPhase2では未対応のため保留
  const handleDownloadAllLabels = async () => {
    if (!shipmentData?.labelUrls || shipmentData.labelUrls.length === 0) return
    try {
      for (let index = 0; index < shipmentData.labelUrls.length; index++) {
        // Phase2最小対応: 個別リンクによる保存は保留
      }
    } catch {}
  }

  useEffect(() => {
    if (!isReady) return
    const trackingNumber = searchParams.get('trackingNumber')
    const labelUrl = searchParams.get('labelUrl')
    const labelUrls = searchParams.get('labelUrls')?.split(',').filter(Boolean) || []
    const paymentId = searchParams.get('paymentId')
    const shipmentId = searchParams.get('shipmentId')
    const type = searchParams.get('type')
    const packageCount = searchParams.get('packageCount')

    if (!shipmentData && trackingNumber && paymentId && (shipmentId || labelUrl || labelUrls.length > 0)) {
      setShipmentData({
        trackingNumber,
        labelUrl: labelUrl ?? undefined,
        labelUrls: labelUrls,
        paymentId,
        shipmentId: shipmentId || 'unknown',
        type: type ?? (packageCount && Number(packageCount) > 1 ? 'mps' : 'standard'),
        packageCount: packageCount ? parseInt(packageCount, 10) : undefined
      })
      return
    }

    const shouldFetchConsistency = !shipmentData && trackingNumber && !shipmentId
    if (!shouldFetchConsistency) return

    let cancelled = false
    setIsFetchingConsistency(true)
    setConsistencyError(null)
    const slowTimer = setTimeout(() => { if (!cancelled) setIsSlow(true) }, 12000)
    ;(async () => {
      try {
        const res = await fetch('/api/ship/consistency', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackingNumber })
        })
        if (!res.ok) throw new Error(`CONSISTENCY_${res.status}`)
        const j = await res.json()
        if (!cancelled && j?.ok) {
          const firstAttachment = Array.isArray(j.attachments) && j.attachments.length > 0 ? j.attachments[0] : null
          const lblUrls: string[] = Array.isArray(j.labelUrls) ? j.labelUrls : (firstAttachment ? [firstAttachment.url] : [])
          setShipmentData({
            trackingNumber: j.trackingNumber || trackingNumber,
            labelUrl: firstAttachment?.url || labelUrl || undefined,
            labelUrls: lblUrls,
            paymentId: paymentId || 'unknown',
            shipmentId: j.shipmentId || shipmentId || 'unknown',
            type: type ?? (packageCount && Number(packageCount) > 1 ? 'mps' : 'standard'),
            packageCount: packageCount ? parseInt(packageCount, 10) : undefined
          })
        }
      } catch (e) {
        if (!cancelled) setConsistencyError((e as Error)?.message || 'CONSISTENCY_ERROR')
      } finally {
        clearTimeout(slowTimer)
        if (!cancelled) setIsFetchingConsistency(false)
      }
    })()
    return () => { cancelled = true; clearTimeout(slowTimer) }
  }, [isReady, searchParams, shipmentData])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="success-title">送り状作成完了！</h1>
          <p className="text-gray-600">決済が完了し、送り状が正常に作成されました</p>
        </div>

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

        {isReady && !shipmentData && (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-gray-600">送り状情報を読み込み中...</p>
                {isFetchingConsistency && (
                  <p className="text-xs text-gray-500">最終整合チェックを実行しています...</p>
                )}
                {isSlow && (
                  <p className="text-xs text-yellow-700">結果の取得に時間がかかっています。少々お待ちください。</p>
                )}
                {consistencyError && (
                  <p className="text-xs text-red-600">整合性チェックで問題が発生しました: {consistencyError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isReady && shipmentData && (
          <>
            <Card className="mb-6">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">処理が完了しました</h2>
                  <p className="text-gray-600">送り状が正常に作成され、決済も完了しています</p>
                  {requestId && (
                    <p className="text-xs text-gray-500 mt-2" data-test="request-id">Request ID: {requestId}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  送り状詳細
                  {shipmentData.type === 'mps' && shipmentData.packageCount && (
                    <span className="ml-auto text-sm bg-green-500 px-2 py-1 rounded-full">
                      MPS {shipmentData.packageCount}個口
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">
                      {shipmentData.type === 'mps' ? 'マスター追跡番号' : '追跡番号'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{shipmentData.trackingNumber}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(shipmentData.trackingNumber)}
                    className="mt-2 sm:mt-0"
                  >
                    コピー
                  </Button>
                </div>

                {shipmentData.type === 'mps' && shipmentData.packageCount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">パッケージ数</span>
                    <span className="font-medium text-blue-600">{shipmentData.packageCount}個口</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">配送タイプ</span>
                  <span className="font-medium">
                    {shipmentData.type === 'mps' ? 'MPS配送' : '通常配送'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">決済ID</span>
                  <span className="font-mono text-sm text-gray-600">{shipmentData.paymentId}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">送り状ID</span>
                  <span className="font-mono text-sm text-gray-600">{shipmentData.shipmentId}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {shipmentData.shipmentId && (
                <Card>
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-lg">送り状ラベル</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        data-test="label-link"
                        href={`/api/download-label?shipmentId=${encodeURIComponent(shipmentData.shipmentId)}&action=attachment`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button className="w-full">ラベルをダウンロード</Button>
                      </a>
                      <Button variant="outline" onClick={handlePrintLabel} className="flex-1" data-testid="cta-print">
                        印刷
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">📦 荷物の追跡</h3>
                  <p className="text-blue-800 text-sm mb-4">FedExの公式サイトで荷物の配送状況を確認できます</p>
                  <a href={`https://www.fedex.com/apps/fedextrack/?tracknumbers=${shipmentData.trackingNumber}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">FedExで追跡する</Button>
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 bg-yellow-50">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ 重要な注意事項</h3>
                  <ul className="text-yellow-800 text-sm space-y-2">
                    <li>• 送り状ラベルは必ず荷物に貼付してください</li>
                    <li>• 追跡番号は配送完了まで大切に保管してください</li>
                    <li>• 国際発送の場合、関税・諸税が別途発生する場合があります</li>
                    <li>• 配送に関するお問い合わせは、追跡番号をお知らせください</li>
                  </ul>
                  <div className="mt-4">
                    <Button data-test="resend-mail" variant="outline" size="sm" onClick={async () => {
                      try {
                        const res = await fetch('/api/email/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentId: shipmentData?.shipmentId }) })
                        if (!res.ok) throw new Error('RESEND_FAILED')
                        toast.success('再送しました')
                      } catch {
                        toast.error('再送に失敗しました')
                      }
                    }}>
                      通知を再送
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between">
                    <Link href="/"><Button variant="outline">ホームに戻る</Button></Link>
                    <Link href="/shipping/new/shipper"><Button>新しい送り状を作成</Button></Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ClientPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-gray-600">ページを読み込み中...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}


