"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Clock, Package, Truck } from "lucide-react"
import { useShippingFormStore } from "@/store/shippingFormStore"
import type { ExtendedQuoteParams } from "@/components/QuoteFormComponent"
import { useAuth } from "@/hooks/useAuth"

export interface Rate {
  serviceId: string
  serviceName: string
  baseRate: number
  totalRate: number
  discountAmount: number
  discountPercentage: number
  transitTime: string
  deliveryTime: string
  arrivalDate: string
  breakdown: {
    baseRate: number
    fuelSurcharge: number
    volumeDiscount: number
    phoenixDiscount?: number
  }
}

interface QuoteResultsProps {
  rates: Rate[]
  selectedRateId?: string
  onRateSelect?: (rate: Rate) => void
  onContinue?: () => void
  quoteParams?: ExtendedQuoteParams // 見積もりフォームの情報を追加
}

export default function QuoteResultsComponent({ 
  rates, 
  selectedRateId, 
  onRateSelect, 
  onContinue,
  quoteParams
}: QuoteResultsProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const setSelectedRate = useShippingFormStore((state) => state.setSelectedRate)
  const setInitialShippingInfoFromQuote = useShippingFormStore((state) => state.setInitialShippingInfoFromQuote)

  // 料金選択ハンドラー
  const handleSelectRate = (rate: Rate) => {
    // Zustandストアに選択された料金を保存
    setSelectedRate({
      serviceName: rate.serviceName,
      amount: rate.totalRate,
      currency: 'JPY',
      transitTime: rate.transitTime,
      serviceType: rate.serviceId
    })

    // 見積もりフォームの情報を送り状フォームに変換・保存
    if (quoteParams) {
      setInitialShippingInfoFromQuote(quoteParams)
    }

    // ログイン状態に関わらず送り状作成フローに遷移（AuthGuardで認証チェック）
    router.push('/shipping/new/shipper')
  }

  if (rates.length === 0) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm lg:text-base text-blue-800 leading-relaxed">
                表示料金をご利用しますか？最大55%割引が適用されました。アカウントを登録して出荷すると、この料金をご利用いただけます。
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 whitespace-nowrap">
              アカウントを登録
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Results List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">配送オプション</h2>

        <div className="space-y-4">
          {rates.map((rate) => (
            <Card 
              key={rate.serviceId} 
              className={`overflow-hidden transition-all cursor-pointer ${
                selectedRateId === rate.serviceId 
                  ? 'ring-2 ring-orange-500 bg-orange-50' 
                  : 'hover:shadow-md hover:bg-gray-50'
              }`}
              onClick={() => {
                // 既存のコールバックも呼び出す（後方互換性のため）
                if (onRateSelect) {
                  onRateSelect(rate)
                }
              }}
            >
              <CardContent className="p-4 lg:p-6 w-full">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Selection Radio */}
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id={`rate-${rate.serviceId}`}
                      name="selectedRate"
                      checked={selectedRateId === rate.serviceId}
                      onChange={() => {
                        if (onRateSelect) {
                          onRateSelect(rate)
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                  </div>

                  {/* Service Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">{rate.serviceName}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">到着日:</span>
                        <span>{rate.arrivalDate}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Truck className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">配達予定:</span>
                        <span>{rate.deliveryTime}</span>
                      </div>
                    </div>

                    {/* フェニックス割引の表示 */}
                    {rate.breakdown.phoenixDiscount && (
                      <div className="text-sm text-red-600 font-medium">
                        フェニックス割引: -¥{Math.abs(rate.breakdown.phoenixDiscount).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="flex flex-col items-end space-y-1">
                    <div className="text-sm text-gray-500 line-through">
                      ¥{rate.baseRate.toLocaleString()}
                    </div>
                    <div 
                      className="bg-orange-500 text-white px-3 py-2 rounded-md cursor-pointer hover:bg-orange-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectRate(rate)
                      }}
                    >
                      <span className="text-lg font-bold">¥{rate.totalRate.toLocaleString()}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      {rate.discountPercentage}% 割引
                    </Badge>
                  </div>
                </div>

                {/* 詳細料金内訳（選択時のみ表示） */}
                {selectedRateId === rate.serviceId && (
                  <div className="mt-4 pt-4 border-t">
                    <Separator className="mb-4" />
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3">料金内訳</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>基本料金</span>
                          <span>¥{rate.breakdown.baseRate.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>燃料割増金</span>
                          <span>¥{rate.breakdown.fuelSurcharge.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-medium">
                          <span>フェニックス割引</span>
                          <span>-¥{Math.abs(rate.breakdown.volumeDiscount).toLocaleString()}</span>
                        </div>
                        {rate.breakdown.phoenixDiscount && (
                          <div className="flex justify-between text-red-600 font-medium">
                            <span>追加フェニックス割引</span>
                            <span>-¥{Math.abs(rate.breakdown.phoenixDiscount).toLocaleString()}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold text-base">
                          <span>見積り合計</span>
                          <span className="text-orange-600">¥{rate.totalRate.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {/* このサービスを選択ボタン */}
                      <div className="mt-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectRate(rate)
                          }}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                        >
                          このサービスを選択
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Button - 既存のonContinueがある場合 */}
        {selectedRateId && onContinue && (
          <div className="pt-6">
            <Button 
              onClick={onContinue}
              className="w-full h-14 text-lg font-semibold text-white" 
              style={{ backgroundColor: "#FF6600" }}
            >
              送り状作成を開始する
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
