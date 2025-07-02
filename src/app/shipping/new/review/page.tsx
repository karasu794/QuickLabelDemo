'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  useShipperInfo, 
  useRecipientInfo, 
  usePackages, 
  useItems, 
  useContents,
  useShippingPurpose 
} from '@/store/shippingFormStore'

export default function Component() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Zustandストアから全てのデータを取得
  const { shipperInfo } = useShipperInfo()
  const { recipientInfo } = useRecipientInfo()
  const { packages } = usePackages()
  const { items } = useItems()
  const { contents } = useContents()
  const { shippingPurpose } = useShippingPurpose()

  // 戻るボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/items')
  }

  // 決済・送信処理
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const shippingData = {
        shipperInfo,
        recipientInfo,
        packages,
        items,
        contents,
        shippingPurpose
      }
      
      console.log('送信データ:', shippingData)
      
      const response = await fetch('/api/ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingData),
      })
      
      if (!response.ok) {
        throw new Error('送信に失敗しました')
      }
      
      const result = await response.json()
      console.log('送信結果:', result)
      
      // 成功時の処理（例：完了ページへの遷移）
      alert('送り状が正常に作成されました！')
      
    } catch (error) {
      console.error('送信エラー:', error)
      alert('送信に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">送り状作成 (5/5) - 最終確認</h1>
          <p className="text-gray-600">以下の内容をご確認の上、決済にお進みください</p>
        </div>

        <div className="space-y-6">
          {/* 荷送人情報 */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
              <h2 className="text-xl font-semibold">荷送人情報</h2>
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
            <div className="p-6 pt-0 space-y-3">
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
            </div>
          </div>

          {/* 荷受人情報 */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
              <h2 className="text-xl font-semibold">荷受人情報</h2>
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
            <div className="p-6 pt-0 space-y-3">
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
            </div>
          </div>

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
            </div>
          </div>

          {/* 内容品 */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
              <h2 className="text-xl font-semibold">内容品・商品詳細</h2>
              <Link
                href="/shipping/new/items"
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
                    {item.hsCode && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">HSコード</p>
                        <p className="font-medium">{item.hsCode}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* 発送目的 */}
                {shippingPurpose && (
                  <div className="border-t border-gray-200 pt-4">
                    <div>
                      <p className="text-sm text-gray-600">発送目的</p>
                      <p className="font-medium">
                        {shippingPurpose === 'personal' ? '個人使用' :
                         shippingPurpose === 'gift' ? '贈答品 (ギフト)' :
                         shippingPurpose === 'commercial' ? '商用 (有償)' : shippingPurpose}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 配送料金 */}
          <div className="bg-blue-50 border-blue-200 border rounded-lg shadow-md">
            <div className="p-6">
              <div className="flex justify-between items-center text-lg">
                <p className="font-semibold text-blue-900">配送料金</p>
                <p className="font-bold text-blue-900 text-2xl">¥8,500</p>
              </div>
              <p className="text-sm text-blue-700 mt-2">※ 関税・諸税は含まれておりません</p>
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div className="pt-6 pb-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              {/* 戻るボタン */}
              <button
                onClick={handlePrevious}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent rounded-md transition-colors duration-200"
              >
                ← 前へ
              </button>
              
              {/* 決済ボタン */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-1/2 h-14 text-lg font-semibold bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white rounded-md transition-colors duration-200"
              >
                {isSubmitting ? '処理中...' : '決済して送り状を作成する'}
              </button>
            </div>
            <p className="text-center text-sm text-gray-600 mt-4">決済完了後、送り状をダウンロードできます</p>
          </div>
        </div>
      </div>
    </div>
  )
}
