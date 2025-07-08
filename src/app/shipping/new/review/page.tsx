'use client'

import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
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
  const selectedRate = useShippingFormStore((state) => state.selectedRate)
  const markStepCompleted = useShippingFormStore((state) => state.markStepCompleted)

  // 動的手数料率の状態
  const [serviceFeePercentage, setServiceFeePercentage] = useState(15) // デフォルト15%

  // 手数料率を取得
  useEffect(() => {
    const fetchServiceFeePercentage = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setServiceFeePercentage(data.service_fee_percentage || 15)
        }
      } catch (error) {
        console.error('手数料率の取得に失敗:', error)
        // エラー時はデフォルトの15%を使用
      }
    }
    
    fetchServiceFeePercentage()
  }, [])

  // 料金計算ロジック
  const calculations = useMemo(() => {
    // 荷物の総重量を計算
    const totalWeight = packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0)
    
    // 選択された料金を使用（selectedRateがない場合はデフォルト値）
    const shippingFee = selectedRate ? Math.round(selectedRate.amount) : 0
    
    // サービス手数料（動的な手数料率を使用）
    const serviceFee = Math.round(shippingFee * (serviceFeePercentage / 100))
    
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
      totalWeight,
      serviceFeePercentage,
      selectedService: selectedRate?.serviceName || '未選択'
    }
  }, [packages, serviceFeePercentage, selectedRate])

  // 戻るボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/items')
  }

  // トークン受信時の処理（決済と送り状作成を統合）
  const handleTokenReceived = async (token: string) => {
    console.log('決済トークン受信:', token)
    setIsProcessingPayment(true)
    setPaymentCompleted(false)
    setPaymentError(null)
    
    try {
      // 送り状データと決済情報を統合してAPIに送信
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
      
      const response = await fetch('/api/ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '送り状作成に失敗しました')
      }
      
      const result = await response.json()
      console.log('決済・送り状作成成功:', result)
      
      // 確認画面ステップを完了としてマーク
      markStepCompleted('/shipping/new/review')
      
      setPaymentCompleted(true)
      
      // 成功ページにリダイレクト
      const successUrl = new URL('/shipping/new/success', window.location.origin)
      successUrl.searchParams.set('trackingNumber', result.trackingNumber)
      successUrl.searchParams.set('paymentId', result.paymentId)
      successUrl.searchParams.set('shipmentId', result.shipmentId)
      if (result.labelUrl) {
        successUrl.searchParams.set('labelUrl', result.labelUrl)
      }
      
      // 少し遅延を入れてからリダイレクト（ユーザーに処理完了を確認させる）
      setTimeout(() => {
        router.push(successUrl.toString())
      }, 1500)
      
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">最終確認</h1>
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
            {/* 料金が選択されていない場合の警告 */}
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

            <div className="space-y-4">
              {/* 選択されたサービス表示 */}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">選択されたサービス</span>
                <span className="font-medium text-blue-600">{calculations.selectedService}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">配送料金</span>
                <span className="font-medium">
                  {selectedRate ? `¥${calculations.shippingFee.toLocaleString()}` : '未選択'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">サービス手数料 ({calculations.serviceFeePercentage}%)</span>
                <span className="font-medium">¥{calculations.serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700">消費税（10%）</span>
                <span className="font-medium">¥{calculations.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t-2 border-[#4D148C]">
                <span className="text-lg font-semibold text-gray-900">最終請求額</span>
                <span className="text-2xl font-bold text-[#4D148C]">
                  {selectedRate ? `¥${calculations.total.toLocaleString()}` : '未算出'}
                </span>
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
            {/* 料金が選択されていない場合の案内 */}
            {!selectedRate && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="h-16 w-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">配送サービスを選択してください</h3>
                <p className="text-gray-600 mb-6">
                  決済を進めるには、まずホームページで料金を見積もり、配送サービスを選択してください。
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  ← ホームページに戻る
                </Link>
              </div>
            )}

            {/* 料金が選択されている場合の決済フォーム */}
            {selectedRate && (
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

                {/* Square決済フォーム */}
                {!paymentCompleted && !isProcessingPayment && (
                  <SquarePaymentForm
                    amount={calculations.total}
                    onTokenReceived={handleTokenReceived}
                    onPaymentError={handlePaymentError}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6">
          <button
            type="button"
            onClick={handlePrevious}
            className="order-2 sm:order-1 px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent rounded-md transition-colors duration-200"
          >
            ← 前へ
          </button>
        </div>
      </div>
    </div>
  )
}
