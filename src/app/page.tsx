// src/app/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import QuoteFormComponent, { Package, ExtendedQuoteParams } from "@/components/QuoteFormComponent"
import FedExQuoteResults, { FedExRate } from "@/components/FedExQuoteResults"
import { usStates, canadianProvinces } from "@/lib/data/locations"

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

// プログレス情報を取得する関数
const getProgressInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        percent: 10,
        message: '依頼を受付中...',
        description: 'リクエストをキューに追加しています'
      }
    case 'processing_auth':
      return {
        percent: 33,
        message: 'FedExサーバーに接続中...',
        description: '認証トークンを取得しています'
      }
    case 'processing_rate_request':
      return {
        percent: 66,
        message: '料金を計算中...',
        description: '配送オプションと料金を取得しています'
      }
    case 'completed':
      return {
        percent: 100,
        message: '完了！',
        description: '見積もりが正常に完了しました'
      }
    default:
      return {
        percent: 0,
        message: '処理中...',
        description: 'しばらくお待ちください'
      }
  }
}

export default function Home() {
  const [quoteParams, setQuoteParams] = useState<ExtendedQuoteParams>({
    originCountry: "JP",
    originPostalCode: "",
    destinationCountry: "US",
    destinationPostalCode: "",
    shipDate: new Date().toISOString().split('T')[0],
    isResidential: false,
    higherInsurance: false,
    declaredValue: "", // 保険の申告金額を初期化
    originStateCode: "",
    originCityName: "",
    destinationStateCode: "",
    destinationCityName: "",
    // 新しいフィールド
    originAddressInput: "",
    destinationAddressInput: "",
    originSelected: false,
    destinationSelected: false
  })

  const [packages, setPackages] = useState<Package[]>([{
    id: 1,
    packagingType: "customer",
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
  const [pollingStatus, setPollingStatus] = useState<string>("")
  const [progress, setProgress] = useState<number>(0)
  const [currentStatus, setCurrentStatus] = useState<string>('') // 現在のステータスを追跡
  
  // ポーリング用のref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        
        // サーバーから取得したステータスに基づいてプログレス情報を設定
        const progressInfo = getProgressInfo(status.status)
        setProgress(progressInfo.percent)
        setPollingStatus(progressInfo.message)
        setCurrentStatus(status.status) // 現在のステータスを保存
        
        console.log(`プログレス更新: ${progressInfo.percent}% - ${progressInfo.message}`)

        switch (status.status) {
          case 'completed':
            // 成功時の処理
            if (status.data?.rates) {
              setQuoteResults(status.data.rates)
              setPollingStatus(`見積もり完了 - ${status.data.rates.length}件の配送オプションを取得しました`)
            } else {
              throw new Error('見積もり結果が見つかりません')
            }
            setIsLoading(false)
            setCurrentJobId(null)
            setCurrentStatus('')
            stopPolling()
            break

          case 'failed':
            // エラー時の処理
            throw new Error(status.error || '見積もりの取得に失敗しました')

          case 'pending':
          case 'processing_auth':
          case 'processing_rate_request':
            // 継続してポーリング
            console.log(`ジョブ進行中: ${status.status} - ${progressInfo.message}`)
            break

          default:
            throw new Error('不明なジョブステータスです')
        }
      } catch (error) {
        console.error('ポーリングエラー:', error)
        setError(error instanceof Error ? error.message : 'ジョブの確認中にエラーが発生しました')
        setIsLoading(false)
        setCurrentJobId(null)
        setCurrentStatus('')
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
      setCurrentStatus('')
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
      packagingType: "customer",
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
    setProgress(0)
    setPollingStatus("")
    setCurrentStatus('') // ステータスをリセット

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

      // Validate declared value if higher insurance is selected
      if (quoteParams.higherInsurance && (!quoteParams.declaredValue || Number.parseFloat(quoteParams.declaredValue) <= 0)) {
        throw new Error("より高額な賠償責任補償を利用する場合は、保険の申告金額を入力してください")
      }

      // 非同期ジョブを開始
      setPollingStatus("見積もりリクエストを送信中...")
      
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
      setPollingStatus(data.message || '見積もりを処理中です...')
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

  // Get state options based on country
  const getOriginStateOptions = () => {
    if (quoteParams.originCountry === 'US') return usStates
    if (quoteParams.originCountry === 'CA') return canadianProvinces
    return []
  }

  const getDestinationStateOptions = () => {
    if (quoteParams.destinationCountry === 'US') return usStates
    if (quoteParams.destinationCountry === 'CA') return canadianProvinces
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
        originStateOptions={getOriginStateOptions()}
        destinationStateOptions={getDestinationStateOptions()}
        postalCodeNotRequiredCountries={POSTAL_CODE_NOT_REQUIRED_COUNTRIES}
      />

      {/* Loading Progress Section */}
      {isLoading && (
        <div className="max-w-4xl mx-auto mt-8 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">見積もり処理中</h3>
                <p className="text-gray-600 mb-4">{pollingStatus}</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    {/* アニメーション効果 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  </div>
                </div>
                
                {/* Progress Percentage */}
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>進捗状況</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                
                {/* Detailed Status */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {getProgressInfo(currentStatus || 'pending').description}
                    </span>
                  </div>
                  
                  {/* Processing Steps */}
                  <div className="flex justify-center space-x-4 text-xs text-gray-500">
                    <div className={`flex items-center space-x-1 ${
                      currentStatus === 'pending' || currentStatus === 'processing_auth' || currentStatus === 'processing_rate_request' || currentStatus === 'completed' 
                      ? 'text-blue-600' : ''
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        currentStatus === 'pending' || currentStatus === 'processing_auth' || currentStatus === 'processing_rate_request' || currentStatus === 'completed'
                        ? 'bg-blue-600' : 'bg-gray-300'
                      }`}></div>
                      <span>受付</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${
                      currentStatus === 'processing_auth' || currentStatus === 'processing_rate_request' || currentStatus === 'completed'
                      ? 'text-blue-600' : ''
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        currentStatus === 'processing_auth' || currentStatus === 'processing_rate_request' || currentStatus === 'completed'
                        ? 'bg-blue-600' : 'bg-gray-300'
                      }`}></div>
                      <span>認証</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${
                      currentStatus === 'processing_rate_request' || currentStatus === 'completed'
                      ? 'text-blue-600' : ''
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        currentStatus === 'processing_rate_request' || currentStatus === 'completed'
                        ? 'bg-blue-600' : 'bg-gray-300'
                      }`}></div>
                      <span>計算</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${
                      currentStatus === 'completed' ? 'text-green-600' : ''
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        currentStatus === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                      <span>完了</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500">
                  FedEx APIから料金情報を取得しています...
                  {currentJobId && (
                    <span className="block mt-1 text-xs">
                      ジョブID: {currentJobId}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section - New FedX Quote Results Component */}
      {quoteResults.length > 0 && !isLoading && (
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
          isUserLoggedIn={false} // TODO: 実際のログイン状態を取得
          quoteParams={{
            originCountry: quoteParams.originCountry,
            originPostalCode: quoteParams.originPostalCode,
            originStateCode: quoteParams.originStateCode,
            originCityName: quoteParams.originCityName,
            originAddressInput: quoteParams.originAddressInput,
            destinationCountry: quoteParams.destinationCountry,
            destinationPostalCode: quoteParams.destinationPostalCode,
            destinationStateCode: quoteParams.destinationStateCode,
            destinationCityName: quoteParams.destinationCityName,
            destinationAddressInput: quoteParams.destinationAddressInput
          }}
        />
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