'use client'

import Link from "next/link"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useShippingFormStore } from '@/store/shippingFormStore'
import SquarePaymentForm from '@/components/SquarePaymentForm'

export default function ReviewPage() {
  const router = useRouter()
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  
  // Zustandストアから直接全てのデータを取得
  const shipperInfo = useShippingFormStore((state) => state.shipperInfo)
  const recipientInfo = useShippingFormStore((state) => state.recipientInfo)
  const packages = useShippingFormStore((state) => state.packages)
  const items = useShippingFormStore((state) => state.items)
  const contents = useShippingFormStore((state) => state.contents)
  const shippingPurpose = useShippingFormStore((state) => state.shippingPurpose)

  // 料金計算ロジック
  const calculations = useMemo(() => {
    // 荷物の総重量を計算
    const totalWeight = packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0)
    
    // 送料計算（簡易計算式）
    const baseShippingFee = 1500 // 基本送料
    const weightFee = totalWeight * 850 // 重量料金（1kgあたり850円）
    const shippingFee = Math.round(baseShippingFee + weightFee)
    
    // サービス手数料（送料の15%）
    const serviceFee = Math.round(shippingFee * 0.15)
    
    // 税金（消費税10%）
    const subtotal = shippingFee + serviceFee
    const tax = Math.round(subtotal * 0.10)
    
    // 最終請求額
    const total = subtotal + tax
    
    return {
      shippingFee,
      serviceFee, 
      tax,
      subtotal,
      total,
      totalWeight
    }
  }, [packages])

  // 戻るボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/items')
  }

  // 決済成功時の処理
  const handlePaymentSuccess = async (paymentId: string) => {
    console.log('決済成功:', paymentId)
    setPaymentCompleted(true)
    setPaymentError(null)
    
    try {
      // 送り状データを送信
      const shippingData = {
        paymentId,
        shipperInfo,
        recipientInfo,
        packages,
        items,
        contents,
        shippingPurpose,
        totalAmount: calculations.total
      }
      
      const response = await fetch('/api/ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingData),
      })
      
      if (!response.ok) {
        throw new Error('送り状作成に失敗しました')
      }
      
      const result = await response.json()
      console.log('送り状作成成功:', result)
      
      // 成功ページへリダイレクト
      alert('決済が完了し、送り状が正常に作成されました！')
      
    } catch (error) {
      console.error('送り状作成エラー:', error)
      setPaymentError('決済は完了しましたが、送り状の作成でエラーが発生しました。サポートにお問い合わせください。')
    }
  }

  // 決済エラー時の処理
  const handlePaymentError = (error: string) => {
    console.error('決済エラー:', error)
    setPaymentError(error)
    setPaymentCompleted(false)
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

          {/* 料金詳細 */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
              <h2 className="text-xl font-semibold">料金詳細</h2>
              <p className="text-purple-100 text-sm">配送料とサービス料の内訳</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">配送料金</span>
                  <span className="font-medium">¥{calculations.shippingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">サービス手数料</span>
                  <span className="font-medium">¥{calculations.serviceFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">消費税（10%）</span>
                  <span className="font-medium">¥{calculations.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-[#4D148C]">
                  <span className="text-lg font-semibold text-gray-900">最終請求額</span>
                  <span className="text-2xl font-bold text-[#4D148C]">¥{calculations.total.toLocaleString()}</span>
                </div>
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
              {/* エラーメッセージ */}
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-700 text-sm">{paymentError}</p>
                </div>
              )}

              {/* 決済完了メッセージ */}
              {paymentCompleted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-700 text-sm font-medium">
                    ✅ 決済が正常に完了しました！送り状を作成中です...
                  </p>
                </div>
              )}

              {/* Square決済フォーム */}
              {!paymentCompleted && (
                <SquarePaymentForm
                  amount={calculations.total}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              )}
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div className="pt-6 pb-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              {/* 戻るボタン */}
              <button
                onClick={handlePrevious}
                disabled={paymentCompleted}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← 前へ
              </button>
              
              {/* 完了状態の表示 */}
              {paymentCompleted && (
                <div className="w-full sm:w-1/2 h-14 flex items-center justify-center text-lg font-semibold bg-green-600 text-white rounded-md">
                  決済完了・送り状作成中
                </div>
              )}
            </div>
            {!paymentCompleted && (
              <p className="text-center text-sm text-gray-600 mt-4">
                決済完了後、送り状をダウンロードできます
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
