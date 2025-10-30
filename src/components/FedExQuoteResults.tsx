"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Badge } from "./ui/badge"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./ui/accordion"
import { Clock, Package, Truck, ChevronRight } from "lucide-react"
import { useShippingFormStore } from "@/store/shippingFormStore"
import type { Package as QuotePackage, ExtendedQuoteParams } from "@/types/quote"

/**
 * FedExの見積もり結果を表示するコンポーネント
 * 
 * @description
 * FedX公式サイトのUIを参考にして、Accordionコンポーネントを使用して
 * 各配送サービスを展開可能なリストアイテムとして表示します。
 * 
 * @example
 * ```tsx
 * // 基本的な使用方法
 * <FedExQuoteResults 
 *   rates={quoteResults} 
 *   isLoading={isLoading}
 *   error={error}
 *   isUserLoggedIn={isLoggedIn}
 *   quoteParams={quoteParams}
 * />
 * 
 * // FedXのAPIレスポンスから直接使用
 * const handleQuoteComplete = (jobResult: any) => {
 *   const fedexRates = jobResult.data.rates.map(rate => ({
 *     serviceType: rate.serviceType,
 *     totalNetFedExCharge: rate.totalNetFedExCharge,
 *     deliveryDate: rate.deliveryDate,
 *     deliveryDayOfWeek: rate.deliveryDayOfWeek,
 *     packagingType: rate.packagingType,
 *     rateType: rate.rateType
 *   }))
 *   
 *   return (
 *     <FedExQuoteResults 
 *       rates={fedexRates}
 *       isLoading={false}
 *       isUserLoggedIn={user !== null}
 *       quoteParams={quoteParams}
 *     />
 *   )
 * }
 * ```
 */

// FedXからのAPIレスポンスデータの型定義
export interface FedExRate {
  serviceType: string
  totalNetFedExCharge: string
  estimatedDeliveryTimestamp?: string
  deliveryDate?: string
  deliveryDayOfWeek?: string
  packagingType: string
  rateType: string
  breakdown?: {
    baseRate: number
    fuelSurcharge: number
    volumeDiscount?: number
    quantityDiscount?: number
    phoenixDiscount?: number
    residentialSurcharge?: number
    deliveryAreaSurcharge?: number
    deliveryAreaLevel?: string | number
    additionalHandlingSurcharge?: number
    importProcessingSurcharge?: number
    saturdayDeliverySurcharge?: number
    peakSurcharge?: number
    otherSurcharge?: number
    insuredValue?: number
    extraSurchargesJa?: Array<{ labelJa: string; amount: number; group: 'additional' | 'other' }>
  }
}

interface FedExQuoteResultsProps {
  /** FedXからの見積もり結果の配列 */
  rates: FedExRate[]
  /** ローディング状態 */
  isLoading: boolean
  /** エラーメッセージ */
  error?: string
  /** ユーザーのログイン状態 */
  isUserLoggedIn?: boolean
  /** 見積もりフォームの情報 */
  quoteParams?: ExtendedQuoteParams
  /** 見積もりフォームの荷物情報 */
  packages?: QuotePackage[]
  /** 選択時のコールバック（共通ピッカーから差し替え可能） */
  onSelectRate?: (rate: FedExRate) => void
  /** アカウント種別表示（export/import） */
  accountType?: 'export' | 'import'
}

export default function FedExQuoteResults({
  rates,
  isLoading,
  error,
  isUserLoggedIn = false,
  quoteParams,
  packages,
  onSelectRate,
  accountType
}: FedExQuoteResultsProps) {
  const router = useRouter()
  const setSelectedRate = useShippingFormStore((state) => state.setSelectedRate)
  const setInitialShippingInfoFromQuote = useShippingFormStore((state) => state.setInitialShippingInfoFromQuote)

  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="text-gray-600">見積もり結果を取得中...</p>
          </div>
        </div>
      </div>
    )
  }

  // エラー状態の表示
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="text-red-600">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-800">エラーが発生しました</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 料金がない場合の表示
  if (!rates || rates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">見積もり結果が見つかりません</h3>
              <p className="text-gray-600">入力内容を確認して、再度お試しください。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 料金の計算とフォーマット
  const formatJPY = (val: number | string) => {
    const n = typeof val === 'string' ? parseFloat(val) : val
    const i = Number.isFinite(n) ? Math.round(n) : 0  // API側のMath.roundと統一
    return `¥${i.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`
  }

  // 0円非表示のヘルパー
  const Line = ({ label, amount, testId }: { label: string; amount: number; testId?: string }) => {
    if (!Number.isFinite(amount) || Math.round(amount) === 0) return null
    return (
      <div className="flex justify-between text-sm" data-test={testId}>
        <span>{label}</span>
        <span className="font-medium">{formatJPY(amount)}</span>
      </div>
    )
  }

  // 配送先国のタイムゾーンマップ（主要国）
  const getDestinationTimezone = (countryCode?: string): string => {
    const tzMap: { [key: string]: string } = {
      'US': 'America/New_York',
      'CA': 'America/Toronto',
      'JP': 'Asia/Tokyo',
      'GB': 'Europe/London',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'AU': 'Australia/Sydney',
      'CN': 'Asia/Shanghai',
      'KR': 'Asia/Seoul',
      'HK': 'Asia/Hong_Kong',
      'SG': 'Asia/Singapore',
    }
    return tzMap[countryCode || ''] || 'UTC'
  }

  // 到着日のキー抽出（配送先タイムゾーンでYYYY-MM-DD形式）
  const toLocalDateKey = (timestamp?: string, destinationCountry?: string): string => {
    if (!timestamp) return '9999-12-31'
    try {
      // YYYY-MM-DD形式の文字列ならそのまま返す
      if (/^\d{4}-\d{2}-\d{2}(?:\s|$)/.test(timestamp)) {
        return timestamp.substring(0, 10)
      }
      
      const date = new Date(timestamp)
      if (Number.isNaN(date.getTime())) {
        return '9999-12-31'
      }
      
      // 配送先タイムゾーンで日付文字列を取得
      const tz = getDestinationTimezone(destinationCountry || quoteParams?.destinationCountry || 'US')
      
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        const parts = formatter.formatToParts(date)
        const year = parts.find(p => p.type === 'year')?.value || ''
        const month = parts.find(p => p.type === 'month')?.value || ''
        const day = parts.find(p => p.type === 'day')?.value || ''
        return `${year}-${month}-${day}`
      } catch {
        return date.toISOString().split('T')[0]
      }
    } catch {
      return '9999-12-31'
    }
  }

  // 日付フォーマット（M/D (曜)）
  const formatDateHeader = (dateKey: string): string => {
    if (dateKey === '9999-12-31') return '到着日未定'
    try {
      const date = new Date(dateKey)
      if (Number.isNaN(date.getTime())) return dateKey
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekdays = ['日', '月', '火', '水', '木', '金', '土']
      const weekday = weekdays[date.getDay()]
      return `${month}/${day} (${weekday})`
    } catch {
      return dateKey
    }
  }

  // サービス優先度（ソート用）
  const getServicePriority = (serviceType: string): number => {
    const priorityMap: { [key: string]: number } = {
      'INTERNATIONAL_FIRST': 1,
      'INTERNATIONAL_PRIORITY_EXPRESS': 2,
      'INTERNATIONAL_PRIORITY': 3,
      'FEDEX_INTERNATIONAL_PRIORITY': 3,
      'INTERNATIONAL_ECONOMY': 4,
      'FEDEX_INTERNATIONAL_ECONOMY': 4,
      'INTERNATIONAL_GROUND': 5,
      'FEDEX_GROUND': 5,
      'FEDEX_EXPRESS_SAVER': 4,
      'FEDEX_2_DAY': 4,
      'STANDARD_OVERNIGHT': 3,
      'PRIORITY_OVERNIGHT': 2,
      'FIRST_OVERNIGHT': 1,
    }
    return priorityMap[serviceType] || 99
  }

  // 時間抽出（estimatedDeliveryTimestamp から）
  const extractTime = (timestamp?: string): string => {
    if (!timestamp) return ''
    // YYYY-MM-DD HH:MM 形式から時間部分を抽出
    const match = timestamp.match(/\s+(\d{1,2}):(\d{2})/)
    if (match) {
      return `${match[1]}:${match[2]}`
    }
    return ''
  }

  // 配達日の解析とフォーマット
  const formatDeliveryInfo = (rate: FedExRate) => {
    const deliveryDate = rate.deliveryDate || rate.estimatedDeliveryTimestamp
    const dayOfWeek = rate.deliveryDayOfWeek
    
    if (deliveryDate) {
      const date = new Date(deliveryDate)
      const formattedDate = date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short'
      })
      const time = extractTime(rate.estimatedDeliveryTimestamp) || getDeliveryTime(rate.serviceType)
      return {
        date: formattedDate,
        time
      }
    }
    
    return {
      date: dayOfWeek || '日時未定',
      time: getDeliveryTime(rate.serviceType)
    }
  }

  // サービスタイプに応じた配達時間の取得
  const getDeliveryTime = (serviceType: string) => {
    const timeMap: { [key: string]: string } = {
      'INTERNATIONAL_PRIORITY': '12:00まで',
      // 'INTERNATIONAL_FIRST': '10:30まで', // FedEx International First除外済み
      'INTERNATIONAL_ECONOMY': '終日',
      'FEDEX_INTERNATIONAL_PRIORITY': '12:00まで',
      'PRIORITY_OVERNIGHT': '10:30まで',
      'STANDARD_OVERNIGHT': '15:00まで',
      'FEDEX_2_DAY': '終日',
      'FEDEX_EXPRESS_SAVER': '終日',
      'FEDEX_GROUND': '終日'
    }
    return timeMap[serviceType] || '終日'
  }

  // サービス名の日本語化（FedEx公式表示名に準拠）
  const getServiceDisplayName = (serviceType: string) => {
    const nameMap: { [key: string]: string } = {
      'INTERNATIONAL_FIRST': 'FedEx International First®',
      'INTERNATIONAL_PRIORITY_EXPRESS': 'FedEx International Priority® Express',
      'INTERNATIONAL_PRIORITY': 'FedEx International Priority®',
      'INTERNATIONAL_ECONOMY': 'FedEx International Economy®',
      'FEDEX_INTERNATIONAL_PRIORITY': 'FedEx International Priority®',
      'FEDEX_INTERNATIONAL_ECONOMY': 'FedEx International Economy®',
      'PRIORITY_OVERNIGHT': 'FedEx Priority Overnight®',
      'STANDARD_OVERNIGHT': 'FedEx Standard Overnight®',
      'FIRST_OVERNIGHT': 'FedEx First Overnight®',
      'FEDEX_2_DAY': 'FedEx 2Day®',
      'FEDEX_EXPRESS_SAVER': 'FedEx Express Saver®',
      'FEDEX_GROUND': 'FedEx Ground®'
    }
    return nameMap[serviceType] || serviceType
  }

  // 配送オプション選択時の処理（差し替え可能）
  const handleRateSelect = (rate: FedExRate) => {
    if (onSelectRate) {
      onSelectRate(rate)
      return
    }
    const deliveryInfo = formatDeliveryInfo(rate)
    
    // Zustandストアに選択された料金を保存
    setSelectedRate({
      serviceName: getServiceDisplayName(rate.serviceType),
      amount: parseInt(rate.totalNetFedExCharge),
      currency: 'JPY',
      transitTime: deliveryInfo.date,
      serviceType: rate.serviceType
    })
    
    // 見積もりフォームの情報（住所・荷物）を送り状フォームに変換・保存
    if (quoteParams) {
      setInitialShippingInfoFromQuote(quoteParams, packages)
    }
    
    // 次のページに遷移
    router.push('/shipping/new/shipper')
  }

  // 到着日でグルーピング（配送先タイムゾーンで日付化）
  const groups: { [key: string]: FedExRate[] } = {}
  const destinationCountry = quoteParams?.destinationCountry || 'US' // デフォルトはUS
  for (const rate of rates) {
    if (rate.serviceType === 'INTERNATIONAL_FIRST') continue // 除外済み
    const dateKey = toLocalDateKey(rate.estimatedDeliveryTimestamp || rate.deliveryDate, destinationCountry)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(rate)
  }

  // グループ内をソート: 時間昇順 → サービス優先度
  Object.keys(groups).forEach(dateKey => {
    groups[dateKey].sort((a, b) => {
      const timeA = extractTime(a.estimatedDeliveryTimestamp)
      const timeB = extractTime(b.estimatedDeliveryTimestamp)
      if (timeA && timeB) {
        const timeCompare = timeA.localeCompare(timeB)
        if (timeCompare !== 0) return timeCompare
      }
      return getServicePriority(a.serviceType) - getServicePriority(b.serviceType)
    })
  })

  // 日付キーをソート
  const dateOrder = Object.keys(groups).sort((a, b) => a.localeCompare(b))

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" data-test="quote-container">
      {/* 未ログイン時の案内のみ表示 */}
      {!isUserLoggedIn && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">表示料金をご利用しますか？</h3>
                <p className="text-sm lg:text-base text-blue-800 leading-relaxed">
                  最大55%割引が適用されました。アカウントを登録して出荷すると、この料金をご利用いただけます。
                </p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 whitespace-nowrap"
                onClick={() => {
                  // 現在の見積もり内容がストアに保存されていることを確認し、
                  // サインアップページへ遷移する
                  router.push('/signup');
                }}
              >
                アカウントを登録
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 配送オプション */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-gray-900">配送オプション</h2>
          {accountType && (
            <Badge data-test={`quote-account-badge-${accountType}`} className={accountType === 'export' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}>
              {accountType === 'export' ? 'export' : 'import'}
            </Badge>
          )}
        </div>
        
        {/* 到着日グループごとに表示 */}
        <div className="space-y-6">
          {dateOrder.map(dateKey => {
            const groupRates = groups[dateKey]
            const groupTotal = groupRates.reduce((sum, r) => sum + parseInt(r.totalNetFedExCharge), 0)
            const dateHeader = formatDateHeader(dateKey)
            
            return (
              <div key={dateKey} data-test={`group-date-${dateKey}`} className="space-y-3">
                {/* グループヘッダー */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{dateHeader}</h3>
                  <span className="text-sm text-gray-600">見積り合計: {formatJPY(groupTotal)}</span>
                </div>
                
                <Accordion type="multiple" collapsible className="space-y-3">
                  {groupRates.map((rate, rateIndex) => {
                    const deliveryInfo = formatDeliveryInfo(rate)
                    const bd = rate.breakdown || {}
                    
                    return (
                      <AccordionItem
                        key={`${rate.serviceType}-${dateKey}-${rateIndex}`}
                        value={`rate-${dateKey}-${rateIndex}`}
                        className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        data-test="quote-card"
                      >
                        <AccordionTrigger className="hover:bg-gray-50 p-0">
                          <div className="flex items-center justify-between w-full p-4">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="flex items-center space-x-2">
                                <Package className="h-5 w-5 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-2 lg:space-y-0">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-700">{deliveryInfo.time}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Truck className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-700 font-medium">
                                      {getServiceDisplayName(rate.serviceType)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div
                                  className="bg-orange-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-orange-600 transition-colors"
                                  data-test="quote-select"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRateSelect(rate)
                                  }}
                                >
                                  <span className="text-lg font-bold">
                                    {formatJPY(rate.totalNetFedExCharge)}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </AccordionTrigger>
                        
                        <AccordionContent>
                          <div className="border-t bg-gray-50 p-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-4" data-test="breakdown-table">
                              <div className="space-y-3">
                                {/* FedEx公式順: 基本 → 米国輸入処理 → 配達地域外 → 混雑時 → 土曜配達 → 燃料 → 数量割引(マイナス) → 合計 */}
                                <Line label="基本料金" amount={bd.baseRate || 0} testId="breakdown-row-baseRate" />
                                <Line label="米国輸入処理手数料" amount={bd.importProcessingSurcharge || 0} testId="breakdown-row-usImportProcessingFee" />
                                <Line 
                                  label={`配達地域外${bd.deliveryAreaLevel ? ` レベル${bd.deliveryAreaLevel}` : ''}`} 
                                  amount={bd.deliveryAreaSurcharge || 0} 
                                  testId="breakdown-row-outOfDeliveryArea" 
                                />
                                <Line label="混雑時割増金" amount={bd.peakSurcharge || 0} testId="breakdown-row-peakSurcharge" />
                                <Line label="土曜配達" amount={bd.saturdayDeliverySurcharge || 0} testId="breakdown-row-saturdayDelivery" />
                                <Line label="燃料割増金" amount={bd.fuelSurcharge || 0} testId="breakdown-row-fuelSurcharge" />
                                
                                {/* 数量割引（マイナス表示、0円は非表示、Math.roundで整数化） */}
                                {((bd.quantityDiscount || bd.volumeDiscount) && Math.round(bd.quantityDiscount || bd.volumeDiscount || 0) > 0) && (
                                  <div className="flex justify-between text-sm" data-test="breakdown-row-quantityDiscount">
                                    <span className="text-red-600 font-medium">数量割引</span>
                                    <span className="font-medium text-red-600">-{formatJPY(Math.round(bd.quantityDiscount || bd.volumeDiscount || 0))}</span>
                                  </div>
                                )}
                                
                                {/* その他のサーチャージ（0円非表示） */}
                                <Line label="個人宅加算" amount={bd.residentialSurcharge || 0} testId="breakdown-row-residentialSurcharge" />
                                <Line label="その他特別取扱い手数料 - 寸法" amount={bd.additionalHandlingSurcharge || 0} testId="breakdown-row-additionalHandlingSurcharge" />
                                <Line label="保険料（申告価格）" amount={bd.insuredValue || 0} testId="breakdown-row-declaredValue" />
                                <Line label="その他特別手数料" amount={bd.otherSurcharge || 0} testId="breakdown-row-otherSurcharge" />
                                
                                {/* extraSurchargesJa（0円非表示） */}
                                {Array.isArray(bd.extraSurchargesJa) && bd.extraSurchargesJa.map((x, idx) => (
                                  <Line key={`extra-${idx}`} label={x.labelJa} amount={x.amount || 0} testId={`breakdown-row-extra-${idx}`} />
                                ))}
                                
                                {/* 合計（常に表示） */}
                                <div className="border-t border-gray-300 pt-3 mt-4">
                                  <div className="flex justify-between items-center" data-test="breakdown-total">
                                    <span className="text-lg font-semibold text-gray-900">見積り合計</span>
                                    <span className="text-lg font-bold text-orange-600">
                                      {formatJPY(rate.totalNetFedExCharge)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              data-test="quote-select"
                              onClick={() => handleRateSelect(rate)}
                              className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                            >
                              このサービスを選択
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 