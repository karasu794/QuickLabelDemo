'use client'

import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useShippingFormStore, useWaitForHydration } from '@/store/shippingFormStore'
import SquarePaymentForm from '@/components/SquarePaymentForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function ReviewPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
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
  const [actualShippingRates, setActualShippingRates] = useState<any>(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState<string | null>(null)

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

  // 実際の配送料金を取得（パッケージ数に応じて自動判定）
  useEffect(() => {
    const fetchActualRates = async () => {
      // ハイドレーション完了を待つ
      if (!isReady || isLoading) {
        console.log(`⏳ Waiting for hydration... isReady: ${isReady}, isLoading: ${isLoading}`)
        return
      }

      // データの有効性をチェック
      if (!shipperInfo.countryCode || !recipientInfo.countryCode || packages.length === 0) {
        console.log(`❌ Required data missing:`, {
          shipperCountry: shipperInfo.countryCode,
          recipientCountry: recipientInfo.countryCode,
          packagesCount: packages.length
        })
        return
      }

      console.log(`🔍 Data check:`, {
        shipperInfo: shipperInfo,
        recipientInfo: recipientInfo,
        packagesCount: packages.length
      })

      setRatesLoading(true)
      setRatesError(null)

      try {
        console.log(`💰 ${packages.length}個パッケージの実際の料金を取得中...`)
        
        const requestData = {
          shipperInfo: {
            countryCode: shipperInfo.countryCode,
            postalCode: shipperInfo.postalCode,
            stateCode: shipperInfo.stateCode,
            cityName: shipperInfo.cityName
          },
          recipientInfo: {
            countryCode: recipientInfo.countryCode,
            postalCode: recipientInfo.postalCode,
            stateCode: recipientInfo.stateCode,
            cityName: recipientInfo.cityName,
            isResidential: recipientInfo.isResidential
          },
          packages: packages.map(pkg => ({
            weight: parseFloat(pkg.weight || '0'),
            type: pkg.type || 'YOUR_PACKAGING',
            length: parseFloat(pkg.length || '0'),
            width: parseFloat(pkg.width || '0'),
            height: parseFloat(pkg.height || '0'),
            declaredValue: parseFloat(pkg.declaredValue || '0')
          })),
          shipDate: new Date().toISOString().split('T')[0]
        }

        // パッケージ数に応じてAPIを選択
        const apiEndpoint = packages.length >= 2 ? '/api/quote/mps' : '/api/quote'
        console.log(`📡 Using ${apiEndpoint} for ${packages.length} packages`)

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(packages.length >= 2 ? requestData : {
            quoteParams: {
              originCountry: shipperInfo.countryCode,
              originPostalCode: shipperInfo.postalCode,
              originStateCode: shipperInfo.stateCode,
              originCityName: shipperInfo.cityName,
              originSelected: true,
              destinationCountry: recipientInfo.countryCode,
              destinationPostalCode: recipientInfo.postalCode,
              destinationStateCode: recipientInfo.stateCode,
              destinationCityName: recipientInfo.cityName,
              destinationSelected: true,
              isResidential: recipientInfo.isResidential,
              shipDate: new Date().toISOString().split('T')[0]
            },
            packages: packages.map((pkg, index) => ({
              id: index + 1,
              packagingType: pkg.type || 'YOUR_PACKAGING',
              weight: pkg.weight || '0',
              length: pkg.length || '0',
              width: pkg.width || '0',
              height: pkg.height || '0',
              declaredValue: pkg.declaredValue || '0'
            }))
          }),
        })

        if (!response.ok) {
          throw new Error('料金の取得に失敗しました')
        }

        const ratesData = await response.json()
        console.log(`✅ 料金取得成功:`, ratesData)
        
        setActualShippingRates(ratesData)

      } catch (error) {
        console.error('❌ 料金取得エラー:', error)
        setRatesError(error instanceof Error ? error.message : '料金の取得に失敗しました')
      } finally {
        setRatesLoading(false)
      }
    }

    fetchActualRates()
  }, [shipperInfo, recipientInfo, packages, isReady, isLoading])

  // 料金計算ロジック（統合版）
  const calculations = useMemo(() => {
    // 荷物の総重量を計算
    const totalWeight = packages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0)
    
    let shippingFee = 0
    let selectedService = '見積もり中...'
    let serviceType = 'standard'

    // 実際の料金が取得できている場合
    if (actualShippingRates && actualShippingRates.rates && actualShippingRates.rates.length > 0) {
      // 最も安い料金を選択（または指定されたサービス）
      const bestRate = selectedRate 
        ? actualShippingRates.rates.find((r: any) => r.serviceType === selectedRate.serviceType) || actualShippingRates.rates[0]
        : actualShippingRates.rates[0]
      
      shippingFee = Math.round(bestRate.amount)
      selectedService = bestRate.serviceName
      serviceType = actualShippingRates.type // 'standard' or 'mps'
    } else if (selectedRate) {
      // フォールバック：選択された料金を使用
      shippingFee = Math.round(selectedRate.amount)
      selectedService = selectedRate.serviceName
    }
    
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
      selectedService,
      serviceType,
      packageCount: packages.length,
      isLoading: ratesLoading,
      error: ratesError
    }
  }, [packages, serviceFeePercentage, selectedRate, actualShippingRates, ratesLoading, ratesError])

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

      console.log(`🚀 ${packages.length}個口の送り状作成処理開始 (${calculations.serviceType})`)
      
      // 統合APIエンドポイントを使用（パッケージ数に応じて自動判定）
      const response = await fetch('/api/ship-unified', {
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
      console.log(`✅ ${result.type}送り状作成成功:`, result)
      
      // 確認画面ステップを完了としてマーク
      markStepCompleted('/shipping/new/review')
      
      setPaymentCompleted(true)
      
      // 成功ページにリダイレクト
      const successUrl = new URL('/shipping/new/success', window.location.origin)
      successUrl.searchParams.set('trackingNumber', result.trackingNumber)
      successUrl.searchParams.set('paymentId', result.paymentId)
      successUrl.searchParams.set('shipmentId', result.shipmentId)
      successUrl.searchParams.set('type', result.type)
      successUrl.searchParams.set('packageCount', result.packageCount.toString())
      
      if (result.labelUrls && result.labelUrls.length > 0) {
        successUrl.searchParams.set('labelUrls', JSON.stringify(result.labelUrls))
      } else if (result.labelUrl) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">最終確認</h1>
          <p className="text-gray-600">以下の内容をご確認の上、決済にお進みください</p>
        </div>

      {/* ハイドレーション待機ローディング */}
      {isLoading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">データを読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* レビュー本体 */}
      {isReady && (

      <div className="space-y-6">
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

        {/* 料金詳細 */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
            <h2 className="text-xl font-semibold">料金詳細</h2>
            <p className="text-purple-100 text-sm">
              {calculations.packageCount > 1 
                ? `複数パッケージ（${calculations.packageCount}個口）最適化料金` 
                : '配送料とサービス料の内訳'}
            </p>
          </div>
          <div className="p-6">
            {/* 料金計算中ローディング */}
            {calculations.isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D148C] mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  最適料金を計算中...
                </h3>
                <p className="text-gray-600">
                  {calculations.packageCount > 1 
                    ? `${calculations.packageCount}個口の最適化されたMPS料金を取得しています`
                    : '最新の配送料金を取得しています'}
                </p>
              </div>
            )}

            {/* 料金計算エラー */}
            {calculations.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-red-700 text-sm font-medium">料金計算エラー</p>
                    <p className="text-red-600 text-sm">{calculations.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 料金が選択されていない場合の警告 */}
            {!selectedRate && !actualShippingRates && !calculations.isLoading && (
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
            {!calculations.isLoading && (
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
                    {calculations.shippingFee > 0 ? `¥${calculations.shippingFee.toLocaleString()}` : '計算中...'}
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
                    {calculations.total > 0 ? `¥${calculations.total.toLocaleString()}` : '計算中...'}
                  </span>
                </div>
              </div>
            )}
            
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
            {(calculations.isLoading || calculations.error || (!selectedRate && !actualShippingRates)) && (
              <div className="text-center py-8">
                <div className="mb-4">
                  {calculations.isLoading ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4D148C] mx-auto"></div>
                  ) : (
                    <svg className="h-16 w-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {calculations.isLoading ? '料金計算中...' : 
                   calculations.error ? '料金計算エラー' : 
                   '配送サービスを選択してください'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {calculations.isLoading ? 
                    `${calculations.packageCount}個口の最適な配送料金を計算しています。しばらくお待ちください。` :
                   calculations.error ? 
                    '料金の計算に失敗しました。ページを更新してやり直してください。' :
                   '決済を進めるには、まずホームページで料金を見積もり、配送サービスを選択してください。'}
                </p>
                {!calculations.isLoading && !calculations.error && (
                  <Link
                    href="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    ← ホームページに戻る
                  </Link>
                )}
              </div>
            )}

            {/* 料金が確定している場合の決済フォーム */}
            {!calculations.isLoading && !calculations.error && calculations.total > 0 && (
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
