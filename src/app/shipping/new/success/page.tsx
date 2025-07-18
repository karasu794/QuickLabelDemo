'use client'

import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useWaitForHydration } from '@/store/shippingFormStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, Package } from 'lucide-react'

interface ShipmentResult {
  trackingNumber: string
  labelUrl?: string
  paymentId: string
  shipmentId: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const { isLoading, isReady } = useWaitForHydration()
  const [shipmentData, setShipmentData] = useState<ShipmentResult | null>(null)

  useEffect(() => {
    // URLパラメータから送り状データを取得
    const trackingNumber = searchParams.get('trackingNumber')
    const labelUrl = searchParams.get('labelUrl')
    const paymentId = searchParams.get('paymentId')
    const shipmentId = searchParams.get('shipmentId')

    if (trackingNumber && paymentId && shipmentId) {
      setShipmentData({
        trackingNumber,
        labelUrl: labelUrl || undefined,
        paymentId,
        shipmentId
      })
    }
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">送り状作成完了！</h1>
          <p className="text-gray-600">決済が完了し、送り状が正常に作成されました</p>
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

        {/* データがない場合のローディング状態 */}
        {isReady && !shipmentData && (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-gray-600">送り状情報を読み込み中...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 成功メッセージとデータ */}
        {isReady && shipmentData && (
          <>
            {/* 成功メッセージヘッダー */}
            <Card className="mb-6">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">処理が完了しました</h2>
                  <p className="text-gray-600">送り状が正常に作成され、決済も完了しています</p>
                </div>
              </CardContent>
            </Card>

            {/* 送り状情報カード */}
            <Card className="mb-6">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  送り状詳細
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* 追跡番号 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">追跡番号</p>
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

                {/* 決済ID */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">決済ID</span>
                  <span className="font-mono text-sm text-gray-600">{shipmentData.paymentId}</span>
                </div>

                {/* 送り状ID */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">送り状ID</span>
                  <span className="font-mono text-sm text-gray-600">{shipmentData.shipmentId}</span>
                </div>
              </CardContent>
            </Card>

            {/* アクションボタン */}
            <div className="space-y-4">
              {/* ラベルダウンロード */}
              {shipmentData.labelUrl && (
                <Card>
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-lg">送り状ラベル</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href={shipmentData.labelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button className="w-full">
                          ラベルをダウンロード
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="flex-1"
                      >
                        印刷
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 追跡情報 */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">📦 荷物の追跡</h3>
                  <p className="text-blue-800 text-sm mb-4">
                    FedExの公式サイトで荷物の配送状況を確認できます
                  </p>
                  <a
                    href={`https://www.fedex.com/apps/fedextrack/?tracknumbers=${shipmentData.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      FedExで追跡する
                    </Button>
                  </a>
                </CardContent>
              </Card>

              {/* 重要な注意事項 */}
              <Card>
                <CardContent className="p-6 bg-yellow-50">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ 重要な注意事項</h3>
                  <ul className="text-yellow-800 text-sm space-y-2">
                    <li>• 送り状ラベルは必ず荷物に貼付してください</li>
                    <li>• 追跡番号は配送完了まで大切に保管してください</li>
                    <li>• 国際発送の場合、関税・諸税が別途発生する場合があります</li>
                    <li>• 配送に関するお問い合わせは、追跡番号をお知らせください</li>
                  </ul>
                </CardContent>
              </Card>

              {/* ナビゲーションボタン */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between">
                    <Link href="/">
                      <Button variant="outline">
                        ホームに戻る
                      </Button>
                    </Link>
                    <Link href="/shipping/new/shipper">
                      <Button>
                        新しい送り状を作成
                      </Button>
                    </Link>
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

export default function SuccessPage() {
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