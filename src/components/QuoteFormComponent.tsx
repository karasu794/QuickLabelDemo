"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Plus, X, Loader2 } from "lucide-react"
import { GooglePlaceAutocomplete, ParsedAddress } from "./GooglePlaceAutocomplete"
import { japanesePrefectures, usStates, canadianProvinces } from "@/lib/data/locations"
import type { ExtendedQuoteParams, Package as PackageType } from "@/types/quote"
import { useAuth } from "@/hooks/useAuth"

const POSTAL_CODE_NOT_REQUIRED_COUNTRIES = ['HK', 'AE', 'SG']
const POLLING_INTERVAL = 3000 // 3秒
const TIMEOUT_DURATION = 60000 // 60秒

export default function QuoteForm() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // フォームの全状態をこのコンポーネント内で管理
  const [quoteParams, setQuoteParams] = useState<Omit<ExtendedQuoteParams, 'packages'>>({
    originCountry: "JP",
    originPostalCode: "",
    originStateCode: "",
    originCityName: "",
    originAddressInput: "",
    originStreet: "",
    originSelected: false,
    originPostalCodeMissing: false,
    originCityNameMissing: false,
    originStateCodeMissing: false,
    destinationCountry: "US",
    destinationPostalCode: "",
    destinationStateCode: "",
    destinationCityName: "",
    destinationAddressInput: "",
    destinationStreet: "",
    destinationSelected: false,
    destinationPostalCodeMissing: false,
    destinationCityNameMissing: false,
    destinationStateCodeMissing: false,
    shipDate: new Date().toISOString().split('T')[0],
    isResidential: false,
    higherInsurance: false,
    isPhoenixShipment: false,
    phoenixMode: 'none',
  })

  const [packages, setPackages] = useState<PackageType[]>([{
    id: 1,
    packagingType: "YOUR_PACKAGING",
    weight: "",
    length: "",
    width: "",
    height: "",
    declaredValue: ""
  }])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteResults, setQuoteResults] = useState<any[] | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout>()

  // 住所入力用の状態
  const [originInput, setOriginInput] = useState("")
  const [destinationInput, setDestinationInput] = useState("")

  // 場所選択時の処理
  const handlePlaceSelect = useCallback((type: 'origin' | 'destination', data: ParsedAddress) => {
    const keyPrefix = type === 'origin' ? 'origin' : 'destination'
    setQuoteParams(prev => ({
      ...prev,
      [`${keyPrefix}Country`]: data.countryCode,
      [`${keyPrefix}PostalCode`]: data.postalCode,
      [`${keyPrefix}StateCode`]: data.stateCode,
      [`${keyPrefix}CityName`]: data.cityName,
      [`${keyPrefix}AddressInput`]: data.fullAddress,
      [`${keyPrefix}Street`]: data.street,
      [`${keyPrefix}Selected`]: true,
    }))
    
    // 入力フィールドも更新
    if (type === 'origin') {
      setOriginInput(data.fullAddress)
    } else {
      setDestinationInput(data.fullAddress)
    }
  }, [])

  // パッケージ関連の処理
  const handlePackageChange = (id: number, field: keyof PackageType, value: string) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }
  const handleAddPackage = () => {
    setPackages(prev => [...prev, { id: Date.now(), packagingType: 'YOUR_PACKAGING', weight: '', length: '', width: '', height: '', declaredValue: '' }])
  }
  const handleRemovePackage = (id: number) => {
    setPackages(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev)
  }

  // フォーム送信（API呼び出し）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setQuoteResults(null)
    if (pollingRef.current) clearInterval(pollingRef.current)

    try {
      // APIに送信するデータを作成
      const requestBody = {
        quoteParams: {
          ...quoteParams,
          // 郵便番号不要国の場合、ダミー値を設定
          originPostalCode: POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && !quoteParams.originPostalCode ? '00000' : quoteParams.originPostalCode,
          destinationPostalCode: POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && !quoteParams.destinationPostalCode ? '00000' : quoteParams.destinationPostalCode,
        },
        packages
      }

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '見積もり依頼に失敗しました。')
      }

      const data = await res.json()
      setJobId(data.jobId)

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsLoading(false)
    }
  }

  // ポーリング処理
  useEffect(() => {
    if (!jobId || !isLoading) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/quote/${jobId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          setQuoteResults(data.data.rates)
          setIsLoading(false)
          clearInterval(pollingRef.current)
        } else if (data.status === 'failed') {
          setError(data.error || '見積もり処理に失敗しました。')
          setIsLoading(false)
          clearInterval(pollingRef.current)
        }
      } catch (err) {
        setError('見積もり結果の取得に失敗しました。')
        setIsLoading(false)
        clearInterval(pollingRef.current)
      }
    }

    pollingRef.current = setInterval(poll, POLLING_INTERVAL)
    const timeout = setTimeout(() => {
      clearInterval(pollingRef.current)
      if (isLoading) {
        setError('処理がタイムアウトしました。')
        setIsLoading(false)
      }
    }, TIMEOUT_DURATION)

    return () => {
      clearInterval(pollingRef.current)
      clearTimeout(timeout)
    }
  }, [jobId, isLoading])

  // 総重量の計算
  const totalWeight = packages.reduce((sum, pkg) => sum + (parseFloat(pkg.weight) || 0), 0).toFixed(1)
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-800">運送料金見積もり</h1>
            <p className="text-gray-600">必須項目を入力して、簡単に見積もりを取得</p>
        </div>
        <Card>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* --- UI要素はここに再実装 --- */}
                    {/* 出荷地 */}
                    <div>
                        <Label>出荷地</Label>
                        <GooglePlaceAutocomplete
                            value={originInput}
                            onChange={setOriginInput}
                            onPlaceSelect={(data) => handlePlaceSelect('origin', data)}
                            placeholder="国、郵便番号、または住所を入力"
                        />
                        {quoteParams.originSelected && (
                            <div className="mt-2 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                                国: {quoteParams.originCountry} | 郵便番号: {quoteParams.originPostalCode} | 都市: {quoteParams.originCityName}
                            </div>
                        )}
                    </div>
                    {/* 仕向地 */}
                    <div>
                        <Label>仕向地</Label>
                        <GooglePlaceAutocomplete
                            value={destinationInput}
                            onChange={setDestinationInput}
                            onPlaceSelect={(data) => handlePlaceSelect('destination', data)}
                            placeholder="国、郵便番号、または住所を入力"
                        />
                         {quoteParams.destinationSelected && (
                            <div className="mt-2 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                                国: {quoteParams.destinationCountry} | 郵便番号: {quoteParams.destinationPostalCode} | 都市: {quoteParams.destinationCityName} | 州/県: {quoteParams.destinationStateCode}
                            </div>
                        )}
                    </div>

                    {/* 貨物詳細 */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">お客様の貨物詳細</h3>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="higherInsurance" checked={quoteParams.higherInsurance} onCheckedChange={(checked) => setQuoteParams(prev => ({...prev, higherInsurance: !!checked}))} />
                          <Label htmlFor="higherInsurance">より高額な保険を使用する</Label>
                        </div>
                        {packages.map((pkg, index) => (
                            <div key={pkg.id} className="border p-4 rounded-lg space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium">パッケージ {index + 1}</h4>
                                    {packages.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => handleRemovePackage(pkg.id)}><X className="h-4 w-4" /></Button>}
                                </div>
                                {/* 梱包材, 重量, 寸法, 申告価額の入力欄をここに実装 */}
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={handleAddPackage} className="w-full">
                            <Plus className="h-4 w-4 mr-2" /> 別のパッケージを追加
                        </Button>
                        <div className="text-right font-semibold">総重量: {totalWeight} kg</div>
                    </div>

                    {/* 出荷日 */}
                     <div className="pt-4 border-t">
                        <Label>希望出荷日</Label>
                        <Input type="date" value={quoteParams.shipDate} onChange={(e) => setQuoteParams(prev => ({...prev, shipDate: e.target.value}))} />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? '見積もり計算中...' : '見積もりを表示'}
                    </Button>
                </form>
            </CardContent>
        </Card>

        {/* 結果表示 */}
        {/* FedExQuoteResultsコンポーネントをここに配置 */}

    </div>
  )
}