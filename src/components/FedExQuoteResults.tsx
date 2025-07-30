"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Badge } from "./ui/badge"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./ui/accordion"
import { Clock, Package, Truck, Calendar, ChevronRight } from "lucide-react"
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
    volumeDiscount: number
    phoenixDiscount?: number
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
}

export default function FedExQuoteResults({
  rates,
  isLoading,
  error,
  isUserLoggedIn = false,
  quoteParams,
  packages
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
  const calculateDiscount = (rate: FedExRate) => {
    const totalCharge = parseInt(rate.totalNetFedExCharge)
    const baseRate = rate.breakdown?.baseRate || totalCharge * 1.3 // 仮の定価（30%割引と仮定）
    const discountAmount = baseRate - totalCharge
    const discountPercentage = Math.round((discountAmount / baseRate) * 100)
    return { baseRate, discountAmount, discountPercentage }
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
      return {
        date: formattedDate,
        time: getDeliveryTime(rate.serviceType)
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
      'INTERNATIONAL_FIRST': '10:30まで',
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

  // サービス名の日本語化
  const getServiceDisplayName = (serviceType: string) => {
    const nameMap: { [key: string]: string } = {
      'INTERNATIONAL_PRIORITY': 'FedEx International Priority',
      'INTERNATIONAL_FIRST': 'FedEx International First',
      'INTERNATIONAL_ECONOMY': 'FedEx International Economy',
      'FEDEX_INTERNATIONAL_PRIORITY': 'FedEx International Priority',
      'PRIORITY_OVERNIGHT': 'FedEx Priority Overnight',
      'STANDARD_OVERNIGHT': 'FedEx Standard Overnight',
      'FEDEX_2_DAY': 'FedEx 2Day',
      'FEDEX_EXPRESS_SAVER': 'FedEx Express Saver',
      'FEDEX_GROUND': 'FedEx Ground'
    }
    return nameMap[serviceType] || serviceType
  }

  // 配送オプション選択時の処理
  const handleRateSelect = (rate: FedExRate) => {
    const { baseRate, discountAmount } = calculateDiscount(rate)
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 whitespace-nowrap">
                アカウントを登録
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 配送オプション */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">配送オプション</h2>
        
        <Accordion type="multiple" collapsible className="space-y-3">
          {rates
            .filter(rate => rate.serviceType !== 'INTERNATIONAL_FIRST') // FedEx International Firstを除外
            .map((rate, index) => {
            const { baseRate, discountAmount, discountPercentage } = calculateDiscount(rate)
            const deliveryInfo = formatDeliveryInfo(rate)
            const isFirst = index === 0
            
            return (
              <AccordionItem
                key={`${rate.serviceType}-${index}`}
                value={`rate-${index}`}
                className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="hover:bg-gray-50 p-0">
                  <div className="flex items-center justify-between w-full p-4">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* 配送アイコン */}
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-orange-600" />
                        {isFirst && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            最安値
                          </Badge>
                        )}
                      </div>
                      
                      {/* 配送情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-2 lg:space-y-0">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{deliveryInfo.date}</span>
                          </div>
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
                    
                    {/* 料金表示 */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500 line-through">
                          ¥{baseRate.toLocaleString()}
                        </div>
                        <div
                          className="bg-orange-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-orange-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRateSelect(rate)
                          }}
                        >
                          <span className="text-lg font-bold">
                            ¥{parseInt(rate.totalNetFedExCharge).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent>
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 料金内訳 */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">料金内訳</h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="space-y-3">
                            {/* 基本料金 */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">基本料金</span>
                              <span className="font-medium text-gray-900">
                                ¥{(rate.breakdown?.baseRate || baseRate).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* フェニックス割引（基本料金の直下に配置） */}
                            <div className="flex justify-between items-center">
                              <span className="text-red-600 font-medium">フェニックス割引</span>
                              <span className="font-medium text-red-600">
                                -¥{Math.abs(rate.breakdown?.volumeDiscount || discountAmount).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* 追加フェニックス割引（もしあれば） */}
                            {rate.breakdown?.phoenixDiscount && (
                              <div className="flex justify-between items-center">
                                <span className="text-red-600 font-medium">追加フェニックス割引</span>
                                <span className="font-medium text-red-600">
                                  -¥{Math.abs(rate.breakdown.phoenixDiscount).toLocaleString()}
                                </span>
                              </div>
                            )}
                            
                            {/* 燃料割増金 */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">燃料割増金</span>
                              <span className="font-medium text-gray-900">
                                ¥{(rate.breakdown?.fuelSurcharge || 0).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* 区切り線 */}
                            <div className="border-t border-gray-300 pt-3 mt-4">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-900">見積り合計</span>
                                <span className="text-lg font-bold text-orange-600">
                                  ¥{parseInt(rate.totalNetFedExCharge).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* サービス詳細 */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">サービス詳細</h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">配送タイプ</span>
                              <span className="font-medium text-gray-900">{rate.rateType}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">梱包タイプ</span>
                              <span className="font-medium text-gray-900">{rate.packagingType}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">お客様割引</span>
                              <span className="font-medium text-green-600">
                                {discountPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleRateSelect(rate)}
                          className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                        >
                          このサービスを選択
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
  )
} 