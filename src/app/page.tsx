// src/app/page.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import QuoteFormComponent, { Package, ExtendedQuoteParams } from "@/components/QuoteFormComponent"
import FedExQuoteResults, { FedExRate } from "@/components/FedExQuoteResults"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usStates, canadianProvinces, japanesePrefectures } from "@/lib/data/locations"
import { useAuth } from "@/hooks/useAuth"
import { useMPSStore } from "@/store/mpsStore"
import { Package as PackageIcon, Zap, Clock, Users, ArrowRight } from "lucide-react"

const POSTAL_CODE_NOT_REQUIRED_COUNTRIES = ['HK', 'AE', 'SG']
const POLLING_INTERVAL = 2000 // 2秒ごとにポーリング
const TIMEOUT_DURATION = 60000 // 60秒でタイムアウト

interface QuoteResult {
  serviceType: string
  totalNetFedExCharge: string
  estimatedDeliveryTimestamp?: string
  deliveryDate?: string
  deliveryDayOfWeek?: string
  packagingType: string
  rateType: string
}

interface JobStatus {
  status: 'pending' | 'processing_auth' | 'processing_rate_request' | 'completed' | 'failed'
  message: string
  jobId: string
  data?: {
    success: boolean
    rates: QuoteResult[]
  }
  error?: string
}

type ShippingMode = 'traditional' | 'mps'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { importFromQuote, resetAll } = useMPSStore()
  
  const [shippingMode, setShippingMode] = useState<ShippingMode>('traditional')
  const [quoteParams, setQuoteParams] = useState<ExtendedQuoteParams>({
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
    phoenixMode: 'none'
  })

  const [packages, setPackages] = useState<Package[]>([{
    id: 1,
    packagingType: "YOUR_PACKAGING",
    weight: "",
    length: "",
    width: "",
    height: "",
    declaredValue: ""
  }])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [quoteResults, setQuoteResults] = useState<QuoteResult[]>([])
  
  // 為替レートとエラー管理
  const [usdToJpyRate, setUsdToJpyRate] = useState<number>(150.0) // デフォルト値
  const [packageErrors, setPackageErrors] = useState<{ [key: number]: string | null }>({})
  
  // 非同期処理のための新しいステート
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  
  // ポーリング用のref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 自動スクロール用のref
  const loadingRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // MPS配送を開始する関数
  const startMPSShipping = () => {
    // 見積もりデータが入力されている場合はMPSストアにインポート
    if (quoteParams.originSelected && quoteParams.destinationSelected && packages.some(pkg => pkg.weight)) {
      // 内容品の仮データを作成
      const mockItems = [{
        description: '商品',
        countryOfManufacture: 'JP',
        quantity: 1,
        weight: parseFloat(packages[0].weight) || 1,
        unitPrice: 10000,
        currency: 'JPY'
      }]
      
      importFromQuote(quoteParams, packages, mockItems)
      console.log('✅ 見積もりデータをMPSにインポートしました')
    } else {
      // データが不十分な場合はリセット
      resetAll()
    }
    
    router.push('/shipping/mps/setup')
  }

  // Reset dependent fields when origin country changes
  useEffect(() => {
    if (quoteParams.originSelected && quoteParams.originCountry !== 'US' && quoteParams.originCountry !== 'CA') {
      setQuoteParams(prev => ({
        ...prev,
        originStateCode: ""
      }))
    }
  }, [quoteParams.originCountry, quoteParams.originSelected])

  // Reset dependent fields when destination country changes
  useEffect(() => {
    if (quoteParams.destinationSelected && quoteParams.destinationCountry !== 'US' && quoteParams.destinationCountry !== 'CA') {
      setQuoteParams(prev => ({
        ...prev,
        destinationStateCode: ""
      }))
    }
  }, [quoteParams.destinationCountry, quoteParams.destinationSelected])

  // 為替レート取得
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate')
        if (response.ok) {
          const data = await response.json()
          setUsdToJpyRate(data.rate)
        }
      } catch (error) {
        console.error('為替レート取得エラー:', error)
      }
    }

    fetchExchangeRate()
  }, [])

  // 申告価額のバリデーション（リアルタイム）
  useEffect(() => {
    if (!quoteParams.higherInsurance) {
      setPackageErrors({})
      return
    }

    const errors: { [key: number]: string | null } = {}
    
    packages.forEach(pkg => {
      const declaredValue = Number(pkg.declaredValue)
      if (declaredValue > 0) {
        const declaredValueUSD = declaredValue / usdToJpyRate
        
        if (declaredValueUSD > 100000) {
          errors[pkg.id] = `申告価額が上限を超えています（上限: $100,000 ≈ ¥${Math.floor(100000 * usdToJpyRate).toLocaleString()}）`
        } else {
          errors[pkg.id] = null
        }
      }
    })
    
    setPackageErrors(errors)
  }, [packages, quoteParams.higherInsurance, usdToJpyRate])

  // ポーリングのクリーンアップ
  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // ジョブステータスのポーリング
  const pollJobStatus = useCallback((jobId: string) => {
    console.log(`ジョブ${jobId}の状況をポーリング開始`)

    // タイムアウト設定
    timeoutRef.current = setTimeout(() => {
      clearPolling()
      setIsLoading(false)
      setError('処理がタイムアウトしました。しばらく待ってから再度お試しください。')
    }, TIMEOUT_DURATION)

    // ポーリング開始
    pollingIntervalRef.current = setInterval(async () => {
      try {
        console.log(`ジョブ${jobId}の状況を確認中...`)
        const response = await fetch(`/api/quote/${jobId}`)
        
        if (!response.ok) {
          throw new Error(`ジョブ状況確認失敗: ${response.status}`)
        }

        const jobStatus: JobStatus = await response.json()
        console.log(`ジョブ${jobId}の現在の状況:`, jobStatus.status)

        if (jobStatus.status === 'completed') {
          clearPolling()
          setIsLoading(false)

          if (jobStatus.data && jobStatus.data.success) {
            setQuoteResults(jobStatus.data.rates)
            setError("")
            // 結果セクションにスクロール
            setTimeout(() => {
              resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          } else {
            setError('見積もり取得に失敗しました。再度お試しください。')
          }
        } else if (jobStatus.status === 'failed') {
          clearPolling()
          setIsLoading(false)
          setError(jobStatus.error || '見積もり処理に失敗しました。再度お試しください。')
        }
      } catch (error) {
        console.error('ジョブ状況確認エラー:', error)
        clearPolling()
        setIsLoading(false)
        setError('見積もり状況の確認に失敗しました。再度お試しください。')
      }
    }, POLLING_INTERVAL)
  }, [clearPolling, resultsRef])

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  const handleQuoteParamsChange = (field: keyof ExtendedQuoteParams, value: string | boolean) => {
    setQuoteParams(prev => ({ ...prev, [field]: value }))
  }

  const handlePackageChange = (id: number, field: keyof Package, value: string) => {
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === id ? { ...pkg, [field]: value } : pkg
      )
    )
  }

  const handleAddPackage = () => {
    const newId = Math.max(...packages.map(p => p.id)) + 1
    const firstPackage = packages[0]
    setPackages(prev => [...prev, {
      id: newId,
      packagingType: firstPackage?.packagingType || "YOUR_PACKAGING",
      weight: "",
      length: firstPackage?.length || "",
      width: firstPackage?.width || "",
      height: firstPackage?.height || "",
      declaredValue: ""
    }])
  }

  const handleRemovePackage = (id: number) => {
    if (packages.length > 1) {
      setPackages(prev => prev.filter(pkg => pkg.id !== id))
    }
  }

  // 住所部分情報を設定する関数
  const setAddressPart = (type: 'origin' | 'destination', data: { countryCode: string; stateCode: string; cityName: string; postalCode: string; address1: string }) => {
    const prefix = type === 'origin' ? 'origin' : 'destination'
    setQuoteParams(prev => ({
      ...prev,
      [`${prefix}CountryCode`]: data.countryCode,
      [`${prefix}StateCode`]: data.stateCode,
      [`${prefix}CityName`]: data.cityName,
      [`${prefix}PostalCode`]: data.postalCode,
      [`${prefix}Address1`]: data.address1,
      [`${prefix}Selected`]: true
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    setError("")
    setQuoteResults([])
    setCurrentJobId(null)

    try {
      console.log('📤 見積もりリクエスト送信開始')

      // 必須フィールドの確認
      if (!quoteParams.originCountry || !quoteParams.destinationCountry) {
        throw new Error("出荷元と出荷先の国を選択してください")
      }

      if (!quoteParams.originSelected) {
        throw new Error("出荷元の住所を選択してください")
      }

      if (!quoteParams.destinationSelected) {
        throw new Error("出荷先の住所を選択してください")
      }

      const hasValidPackage = packages.some(pkg => pkg.weight && parseFloat(pkg.weight) > 0)
      if (!hasValidPackage) {
        throw new Error("少なくとも1つの荷物の重量を入力してください")
      }

      // Validate declared value for higher insurance
      if (quoteParams.higherInsurance) {
        for (const pkg of packages) {
          if (!pkg.declaredValue || Number(pkg.declaredValue) <= 0) {
            throw new Error("追加保険に加入する場合は、すべての荷物に申告価額を入力してください")
          }
        }
        
        // リアルタイムバリデーションでエラーがある場合は実行を停止
        const hasErrors = Object.values(packageErrors).some(error => error !== null)
        if (hasErrors) {
          throw new Error("申告価額の上限エラーを修正してから見積もりを実行してください")
        }
      }

      // 📍 FedEx API送信用の住所データ準備
      // 郵便番号不要国で郵便番号が空の場合、ダミー値を設定
      const apiQuoteParams = { ...quoteParams };
      
      if (POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && !quoteParams.originPostalCode) {
        apiQuoteParams.originPostalCode = '00000';
        console.log(`出荷地: 郵便番号不要国(${quoteParams.originCountry})のため、ダミー郵便番号を設定: 00000`);
      }
      
      if (POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && !quoteParams.destinationPostalCode) {
        apiQuoteParams.destinationPostalCode = '00000';
        console.log(`仕向地: 郵便番号不要国(${quoteParams.destinationCountry})のため、ダミー郵便番号を設定: 00000`);
      }

      // 非同期ジョブを開始
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteParams: apiQuoteParams,
          packages
        }),
      })

      console.log(`ジョブ作成レスポンス: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: リクエストに失敗しました`)
      }

      const result = await response.json()
      console.log('ジョブ作成成功:', result)

      if (result.success && result.jobId) {
        setCurrentJobId(result.jobId)
        console.log(`✅ ジョブ作成成功: ${result.jobId}`)
        
        // ローディングセクションにスクロール
        setTimeout(() => {
          loadingRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)

        // ポーリング開始
        pollJobStatus(result.jobId)
      } else {
        throw new Error('ジョブ作成に失敗しました')
      }

    } catch (error) {
      console.error('見積もりエラー:', error)
      setIsLoading(false)
      setError(error instanceof Error ? error.message : '見積もりの取得に失敗しました')
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            国際配送サービス
          </h1>
          <p className="text-lg text-gray-600">
            FedExを使った信頼できる国際配送で、世界中にお荷物をお届けします
          </p>
        </div>

        {/* 配送モード選択 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">配送方法を選択してください</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 従来の配送 */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  shippingMode === 'traditional' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setShippingMode('traditional')}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      shippingMode === 'traditional' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Zap className={`h-8 w-8 ${
                        shippingMode === 'traditional' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">従来の配送</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    見積もり→送り状作成→決済の流れ<br />
                    少数パッケージに最適
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>即座に料金確定</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <PackageIcon className="h-3 w-3" />
                      <span>1〜10個程度のパッケージ</span>
                    </div>
                  </div>
                  {shippingMode === 'traditional' && (
                    <Badge className="mt-3 bg-blue-100 text-blue-800">選択中</Badge>
                  )}
                </CardContent>
              </Card>

              {/* MPS配送 */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  shippingMode === 'mps' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setShippingMode('mps')}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      shippingMode === 'mps' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Users className={`h-8 w-8 ${
                        shippingMode === 'mps' ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">MPS配送</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    段階的パッケージ追加対応<br />
                    大量パッケージに最適
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>5日間で段階的追加</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <PackageIcon className="h-3 w-3" />
                      <span>最大300個のパッケージ</span>
                    </div>
                  </div>
                  {shippingMode === 'mps' && (
                    <Badge className="mt-3 bg-green-100 text-green-800">選択中</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* MPSモード選択時のアクション */}
            {shippingMode === 'mps' && (
              <div className="mt-6 text-center">
                <Button
                  onClick={startMPSShipping}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                >
                  MPS配送を開始
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  ※ 下記の見積もりデータがある場合は自動で引き継がれます
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 従来の見積もりフォーム（traditionalモードの場合のみ表示） */}
        {shippingMode === 'traditional' && (
          <>
            {/* Quote Form */}
            <QuoteFormComponent
              quoteParams={quoteParams}
              packages={packages}
              isLoading={isLoading}
              error={error}
              packageErrors={packageErrors}
              onQuoteParamsChange={handleQuoteParamsChange}
              onPackageChange={handlePackageChange}
              onAddPackage={handleAddPackage}
              onRemovePackage={handleRemovePackage}
              onSubmit={handleSubmit}
            />

            {/* Loading Section */}
            {isLoading && (
              <div ref={loadingRef} className="text-center py-8">
                <div className="inline-flex items-center px-6 py-3 bg-blue-50 text-blue-700 rounded-lg">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  見積もり計算中です...
                  {currentJobId && (
                    <span className="ml-2 text-sm">
                      (ジョブID: {currentJobId.substring(0, 8)}...)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Results Section - New FedX Quote Results Component */}
            {quoteResults.length > 0 && !isLoading && (
              <div ref={resultsRef}>
                <FedExQuoteResults 
                  rates={quoteResults.map(result => ({
                    serviceType: result.serviceType,
                    totalNetFedExCharge: result.totalNetFedExCharge,
                    estimatedDeliveryTimestamp: result.estimatedDeliveryTimestamp,
                    deliveryDate: result.deliveryDate,
                    deliveryDayOfWeek: result.deliveryDayOfWeek,
                    packagingType: result.packagingType,
                    rateType: result.rateType
                  }))}
                  isLoading={false}
                  isUserLoggedIn={isAuthenticated}
                  quoteParams={quoteParams}
                  packages={packages}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

// サービスタイプの説明を取得する関数
function getServiceDescription(serviceType: string): string {
  const descriptions: { [key: string]: string } = {
    'INTERNATIONAL_PRIORITY': '国際優先配送 - 最速の国際配送サービス',
    'INTERNATIONAL_ECONOMY': '国際エコノミー配送 - 経済的な国際配送サービス', 
    'INTERNATIONAL_FIRST': '国際ファースト配送 - プレミアム国際配送サービス',
    'INTERNATIONAL_PRIORITY_EXPRESS': '国際優先エクスプレス - 超高速国際配送',
    'FEDEX_INTERNATIONAL_PRIORITY': 'FedEx国際優先配送 - 信頼性の高い国際配送',
    'FEDEX_INTERNATIONAL_ECONOMY': 'FedEx国際エコノミー - コスト効率の良い国際配送',
    'INTERNATIONAL_GROUND': '国際陸送 - 地上輸送による経済的配送',
    'FEDEX_GROUND': 'FedEx陸送 - 地上輸送による国内配送',
    'FEDEX_EXPRESS_SAVER': 'FedExエクスプレスセーバー - 翌々日配送',
    'FEDEX_2_DAY': 'FedEx 2日配送 - 2営業日以内の配送',
    'STANDARD_OVERNIGHT': '翌日配送(標準) - 翌営業日の配送',
    'PRIORITY_OVERNIGHT': '翌日配送(優先) - 翌営業日の午前中配送',
    'FIRST_OVERNIGHT': '翌日配送(ファースト) - 翌営業日の最優先配送'
  };
  
  return descriptions[serviceType] || '配送サービス';
}