'use client'

import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

interface ShipmentResult {
  trackingNumber: string
  labelUrl?: string
  paymentId: string
  shipmentId: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
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

  // データがない場合のローディング状態
  if (!shipmentData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D148C] mx-auto mb-4"></div>
          <p className="text-gray-600">送り状情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 成功メッセージヘッダー */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">送り状作成完了！</h1>
        <p className="text-gray-600">決済が完了し、送り状が正常に作成されました</p>
      </div>

      {/* 送り状情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
          <h2 className="text-xl font-semibold">送り状詳細</h2>
          <p className="text-purple-100 text-sm">以下の情報で送り状が作成されました</p>
        </div>
        <div className="p-6 space-y-4">
          {/* 追跡番号 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">追跡番号</p>
              <p className="text-lg font-bold text-gray-900">{shipmentData.trackingNumber}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(shipmentData.trackingNumber)}
              className="mt-2 sm:mt-0 px-4 py-2 bg-[#4D148C] text-white text-sm rounded-md hover:bg-[#3D0F6B] transition-colors duration-200"
            >
              コピー
            </button>
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
        </div>
      </div>

      {/* アクションボタン */}
      <div className="space-y-4">
        {/* ラベルダウンロード */}
        {shipmentData.labelUrl && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">送り状ラベル</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={shipmentData.labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#4D148C] text-white rounded-md hover:bg-[#3D0F6B] transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ラベルをダウンロード
              </a>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                印刷
              </button>
            </div>
          </div>
        )}

        {/* 追跡情報 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📦 荷物の追跡</h3>
          <p className="text-blue-800 text-sm mb-4">
            FedExの公式サイトで荷物の配送状況を確認できます
          </p>
          <a
            href={`https://www.fedex.com/apps/fedextrack/?tracknumbers=${shipmentData.trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            FedExで追跡する
          </a>
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/shipping/new/shipper"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#4D148C] text-white rounded-md hover:bg-[#3D0F6B] transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新しい送り状を作成
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            ホームに戻る
          </Link>
        </div>
      </div>

      {/* 重要な注意事項 */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ 重要な注意事項</h3>
        <ul className="text-yellow-800 text-sm space-y-2">
          <li>• 送り状ラベルは必ず荷物に貼付してください</li>
          <li>• 追跡番号は配送完了まで大切に保管してください</li>
          <li>• 国際発送の場合、関税・諸税が別途発生する場合があります</li>
          <li>• 配送に関するお問い合わせは、追跡番号をお知らせください</li>
        </ul>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D148C] mx-auto mb-4"></div>
          <p className="text-gray-600">ページを読み込み中...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
} 