// src/app/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import QuoteFormComponent, { Package, ExtendedQuoteParams } from "@/components/QuoteFormComponent"
import FedExQuoteResults, { FedExRate } from "@/components/FedExQuoteResults"
import { usStates, canadianProvinces, japanesePrefectures } from "@/lib/data/locations"
import { useAuth } from "@/hooks/useAuth"

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



export default function Home() {
  const { isAuthenticated } = useAuth()
  const [quoteParams, setQuoteParams] = useState<ExtendedQuoteParams>({
    originCountry: "JP",
    originPostalCode: "",
    originStateCode: "",
    originCityName: "",
    originAddressInput: "",
    originStreet: "",
    originSelected: false,
    destinationCountry: "US",
    destinationPostalCode: "",
    destinationStateCode: "",
    destinationCityName: "",
    destinationAddressInput: "",
    destinationStreet: "",
    destinationSelected: false,
    shipDate: new Date().toISOString().split('T')[0],
    isResidential: false,
    higherInsurance: false,
    declaredValue: ""
  })

  const [packages, setPackages] = useState<Package[]>([{
    id: 1,
    packagingType: "YOUR_PACKAGING",
    weight: "",
    length: "",
    width: "",
    height: ""
  }])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [quoteResults, setQuoteResults] = useState<QuoteResult[]>([])
  
  // 非同期処理のための新しいステート
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  
  // ポーリング用のref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 自動スクロール用のref
  const loadingRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

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

  // ポーリングの停止
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // ジョブステータスのチェック
  const checkJobStatus = async (jobId: string): Promise<JobStatus> => {
    console.log(`ジョブステータス確認開始: ${jobId}`)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒でタイムアウト
      
      const response = await fetch(`/api/quote/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log(`レスポンス受信: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        let errorMessage = `ジョブステータスの確認に失敗しました (${response.status}: ${response.statusText})`
        
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          console.error('レスポンス解析エラー:', parseError)
        }
        
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('ジョブステータス取得成功:', data)
      return data
      
    } catch (error) {
      console.error('checkJobStatus内部エラー:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('ジョブステータスの確認がタイムアウトしました')
        }
        if (error.message.includes('fetch')) {
          throw new Error(`ネットワークエラー: ${error.message}`)
        }
        throw error
      }
      
      throw new Error('ジョブステータスの確認中に不明なエラーが発生しました')
    }
  }

  // ポーリング開始
  const startPolling = (jobId: string) => {
    let checks = 0

    const poll = async () => {
      try {
        checks++
        console.log(`ジョブステータスチェック中 (${checks}回目): ${jobId}`)
        
        const status = await checkJobStatus(jobId)
        console.log('取得したステータス:', status.status)
        
        console.log(`ステータス更新: ${status.status}`)

        switch (status.status) {
          case 'completed':
            // 成功時の処理
            if (status.data?.rates) {
              setQuoteResults(status.data.rates)
            } else {
              throw new Error('見積もり結果が見つかりません')
            }
            setIsLoading(false)
            setCurrentJobId(null)
            stopPolling()
            break

          case 'failed':
            // エラー時の処理
            throw new Error(status.error || '見積もりの取得に失敗しました')

          case 'pending':
          case 'processing_auth':
          case 'processing_rate_request':
            // 継続してポーリング
            console.log(`ジョブ進行中: ${status.status}`)
            break

          default:
            throw new Error('不明なジョブステータスです')
        }
      } catch (error) {
        console.error('ポーリングエラー:', error)
        setError(error instanceof Error ? error.message : 'ジョブの確認中にエラーが発生しました')
        setIsLoading(false)
        setCurrentJobId(null)
        stopPolling()
      }
    }

    // 初回即座にチェック
    poll()

    // 定期的なポーリングを開始（より頻繁にチェック）
    pollingIntervalRef.current = setInterval(poll, 1000) // 1秒ごとに変更

    // タイムアウト設定
    timeoutRef.current = setTimeout(() => {
      setError('見積もりの取得がタイムアウトしました。もう一度お試しください。')
      setIsLoading(false)
      setCurrentJobId(null)
      stopPolling()
    }, TIMEOUT_DURATION)
  }

  const handleQuoteParamsChange = (field: keyof ExtendedQuoteParams, value: string | boolean) => {
    setQuoteParams(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear any existing error when user makes changes
    if (error) {
      setError("")
    }
  }

  const handlePackageChange = (id: number, field: keyof Package, value: string) => {
    setPackages(prev => prev.map(pkg => 
      pkg.id === id ? { ...pkg, [field]: value } : pkg
    ))
  }

  const handleAddPackage = () => {
    const newId = Math.max(...packages.map(p => p.id)) + 1
    setPackages(prev => [...prev, {
      id: newId,
      packagingType: "YOUR_PACKAGING",
      weight: "",
      length: "",
      width: "",
      height: ""
    }])
  }

  const handleRemovePackage = (id: number) => {
    if (packages.length > 1) {
      setPackages(prev => prev.filter(pkg => pkg.id !== id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setQuoteResults([])

    try {
      // Validate required fields (same as before)
      if (!quoteParams.originSelected || !quoteParams.destinationSelected) {
        throw new Error("出荷地と仕向地の両方を選択してください")
      }

      if (!quoteParams.originCountry || !quoteParams.destinationCountry) {
        throw new Error("出荷地と仕向地の国を選択してください")
      }

      // Validate postal codes for countries that require them
      if (!POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && !quoteParams.originPostalCode) {
        throw new Error("出荷地の郵便番号を入力してください")
      }

      if (!POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && !quoteParams.destinationPostalCode) {
        throw new Error("仕向地の郵便番号を入力してください")
      }

      // Validate state codes for US and Canada
      if ((quoteParams.originCountry === 'US' || quoteParams.originCountry === 'CA') && !quoteParams.originStateCode) {
        throw new Error("出荷地の州・県を選択してください")
      }

      if ((quoteParams.destinationCountry === 'US' || quoteParams.destinationCountry === 'CA') && !quoteParams.destinationStateCode) {
        throw new Error("仕向地の州・県を選択してください")
      }

      // Validate city names for postal code not required countries
      if (POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && !quoteParams.originCityName) {
        throw new Error("出荷地の都市名を入力してください")
      }

      if (POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && !quoteParams.destinationCityName) {
        throw new Error("仕向地の都市名を入力してください")
      }

      // Validate packages
      for (const pkg of packages) {
        if (!pkg.weight || Number.parseFloat(pkg.weight) <= 0) {
          throw new Error("すべてのパッケージの重量を入力してください")
        }

        if (pkg.packagingType === "customer") {
          if (!pkg.length || !pkg.width || !pkg.height || 
              Number.parseFloat(pkg.length) <= 0 || 
              Number.parseFloat(pkg.width) <= 0 || 
              Number.parseFloat(pkg.height) <= 0) {
            throw new Error("お客様ご用意の梱包材を選択した場合は、すべての寸法を入力してください")
          }
        }
      }

      // Validate ship date
      if (!quoteParams.shipDate) {
        throw new Error("出荷日を選択してください")
      }

      // Validate declared value for higher insurance
      if (quoteParams.higherInsurance && (!quoteParams.declaredValue || Number(quoteParams.declaredValue) <= 0)) {
        throw new Error("追加保険に加入する場合は、保証金額を入力してください")
      }



      // 非同期ジョブを開始
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteParams,
          packages
        }),
      })

      console.log(`ジョブ作成レスポンス: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('ジョブ作成エラーレスポンス:', errorData)
        throw new Error(errorData.error || `APIエラー: ${response.status}`)
      }

      const data = await response.json()
      console.log('ジョブ作成成功:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.jobId) {
        throw new Error('ジョブIDが返されませんでした')
      }

      // ジョブIDを保存してポーリング開始
      console.log(`ポーリング開始: ジョブID ${data.jobId}`)
      setCurrentJobId(data.jobId)
      
      // ローディング部分まで自動スクロール
      setTimeout(() => {
        loadingRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
      
      startPolling(data.jobId)

    } catch (err) {
      console.error('Quote request failed:', err)
      setError(err instanceof Error ? err.message : '見積もりの取得に失敗しました')
      setIsLoading(false)
    }
  }

  // コンポーネントアンマウント時にポーリングを停止
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  // 結果表示時の自動スクロール
  useEffect(() => {
    if (quoteResults.length > 0 && !isLoading && resultsRef.current) {
      // 結果が表示されたら結果セクションまでスクロール
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }, 100) // 少し遅延を入れてDOMの更新を待つ
    }
  }, [quoteResults.length, isLoading])

  // Get state options based on country
  const getOriginStateOptions = () => {
    if (quoteParams.originCountry === 'US') return usStates
    if (quoteParams.originCountry === 'CA') return canadianProvinces
    if (quoteParams.originCountry === 'JP') return japanesePrefectures
    return []
  }

  const getDestinationStateOptions = () => {
    if (quoteParams.destinationCountry === 'US') return usStates
    if (quoteParams.destinationCountry === 'CA') return canadianProvinces
    if (quoteParams.destinationCountry === 'JP') return japanesePrefectures
    return []
  }

  return (
    <main>
      <QuoteFormComponent
        quoteParams={quoteParams}
        packages={packages}
        isLoading={isLoading}
        error={error}
        onQuoteParamsChange={handleQuoteParamsChange}
        onPackageChange={handlePackageChange}
        onAddPackage={handleAddPackage}
        onRemovePackage={handleRemovePackage}
        onSubmit={handleSubmit}
      />

      {/* Loading Section - Spinner with Simple Text */}
      {isLoading && (
        <div ref={loadingRef} className="max-w-4xl mx-auto mt-8 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">見積もり処理中</h3>
            </div>
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