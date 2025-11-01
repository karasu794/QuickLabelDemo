// src/app/page.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import QuoteFormComponent from "@/components/QuoteFormComponent"
import FedExQuoteResults, { FedExRate } from "@/components/FedExQuoteResults"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usStates, canadianProvinces, japanesePrefectures } from "@/lib/data/locations"
import { useAuth } from "@/hooks/useAuth"
import { Package as PackageIcon, Zap, Clock, Users, ArrowRight } from "lucide-react"
import type { Package, ExtendedQuoteParams } from "@/types/quote"
import QuotePickerShared from "@/components/quotes/QuotePickerShared"

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
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
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
    phoenixMode: 'none',
    samePackageCount: 1,
    declaredValueJPY: 0
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
  
  // 保険金額検証（パッケージごと）
  const [insuranceValidation, setInsuranceValidation] = useState<{
    hasAnyOverLimit: boolean
    isValidating: boolean
    packageValidations: { [packageId: number]: {
      isOverLimit: boolean
      limitYen: number
      errorMessage: string | null
    }}
  }>({
    hasAnyOverLimit: false,
    isValidating: false,
    packageValidations: {}
  })
  
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

  // 保険金額検証関数
  const validateInsurance = useCallback(async () => {
    if (!quoteParams.higherInsurance) {
      setInsuranceValidation({
        hasAnyOverLimit: false,
        isValidating: false,
        packageValidations: {}
      })
      setPackageErrors({})
      return
    }

    // 申告価額が設定されたパッケージのみ検証
    const packagesWithValue = packages.filter(pkg => pkg.declaredValue && Number(pkg.declaredValue) > 0)
    
    if (packagesWithValue.length === 0) {
      setInsuranceValidation({
        hasAnyOverLimit: false,
        isValidating: false,
        packageValidations: {}
      })
      return
    }

    try {
      setInsuranceValidation(prev => ({ ...prev, isValidating: true }))
      
      const response = await fetch('/api/validate-insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packages: packages.map(pkg => ({
            id: pkg.id,
            packagingType: pkg.packagingType,
            declaredValue: pkg.declaredValue
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('検証APIエラー')
      }

      const result = await response.json()
      
      // パッケージごとの検証結果を整理
      const packageValidations: { [packageId: number]: {
        isOverLimit: boolean
        limitYen: number
        errorMessage: string | null
      }} = {}

      result.packageValidations.forEach((validation: any) => {
        packageValidations[validation.packageId] = {
          isOverLimit: validation.isOverLimit,
          limitYen: validation.limitYen,
          errorMessage: validation.errorMessage
        }
      })

      setInsuranceValidation({
        hasAnyOverLimit: result.hasAnyOverLimit,
        isValidating: false,
        packageValidations
      })

      // 個別パッケージのエラーもクリア
      setPackageErrors({})

    } catch (error) {
      console.error('保険金額検証エラー:', error)
      setInsuranceValidation({
        hasAnyOverLimit: false,
        isValidating: false,
        packageValidations: {}
      })
    }
  }, [packages, quoteParams.higherInsurance])

  // 保険金額が変更された時の検証実行
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateInsurance()
    }, 500) // 0.5秒のデバウンス

    return () => clearTimeout(timeoutId)
  }, [validateInsurance])

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
        
        // 保険金額検証でエラーがある場合は実行を停止
        if (insuranceValidation.hasAnyOverLimit) {
          throw new Error("保険金額が上限を超えています。金額を修正してから見積もりを実行してください")
        }
        
        const hasErrors = Object.values(packageErrors).some(error => error !== null)
        if (hasErrors) {
          throw new Error("申告価額の上限エラーを修正してから見積もりを実行してください")
        }
      }

      // 📍 FedEx API送信用の住所データ準備
  // 郵便番号不要国で郵便番号が空の場合、ダミー値を設定
      const apiQuoteParams: any = { ...quoteParams };
      // 追加フィールドの保全（初期値/バリデーション済み）
      const dv = Math.max(0, Number((apiQuoteParams as any).declaredValue || 0))
      apiQuoteParams.higherInsurance = dv > 0
      apiQuoteParams.declaredValue = dv
      apiQuoteParams.isResidential = Boolean(apiQuoteParams.isResidential)
      // shipDate は既に YYYY-MM-DD 初期化済み（ShipDatePicker経由で更新される）
      // 日曜日が選択された場合は自動的に月曜に補正されている
      if (!apiQuoteParams.shipDate) {
        apiQuoteParams.shipDate = new Date().toISOString().split('T')[0]
        console.warn('⚠️ shipDateが空のため、今日の日付を設定しました')
      }
      console.log('📅 出荷日をAPIに送信:', apiQuoteParams.shipDate)
      
      if (POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.originCountry) && !quoteParams.originPostalCode) {
        apiQuoteParams.originPostalCode = '00000';
        console.log(`出荷地: 郵便番号不要国(${quoteParams.originCountry})のため、ダミー郵便番号を設定: 00000`);
      }
      
      if (POSTAL_CODE_NOT_REQUIRED_COUNTRIES.includes(quoteParams.destinationCountry) && !quoteParams.destinationPostalCode) {
        apiQuoteParams.destinationPostalCode = '00000';
        console.log(`お届け先（国／地域）: 郵便番号不要国(${quoteParams.destinationCountry})のため、ダミー郵便番号を設定: 00000`);
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
        // 422のときはエラーマップをユーザーに提示してリトライ可能にする
        if (response.status === 422) {
          const err = await response.json().catch(() => ({} as any))
          const errs = (err && err.errors) || {}
          const flat = Object.keys(errs).flatMap((k) => errs[k]).join(' / ')
          setIsLoading(false)
          setError(flat || '入力に不備があります。修正して再度お試しください。')
          return
        }
        const errorData = await response.json().catch(() => ({} as any))
        throw new Error(errorData.error || `HTTP ${response.status}: リクエストに失敗しました`)
      }

      const result = await response.json()
      console.log('ジョブ作成成功:', result)

      if (result.ok && result.jobId) {
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
        {/* 見積もりフォーム */}
        <QuoteFormComponent
          quoteParams={quoteParams}
          packages={packages}
          isLoading={isLoading}
          error={error}
          packageErrors={packageErrors}
          insuranceValidation={insuranceValidation}
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
            </div>
          </div>
        )}

        {/* Results Section - Unified FedEx Quote Results Component */}
        {quoteResults.length > 0 && !isLoading && (
          <div ref={resultsRef}>
            <FedExQuoteResults 
              rates={quoteResults.map(result => ({
                serviceType: result.serviceType as any,
                totalNetFedExCharge: (result as any).totalNetFedExCharge,
                estimatedDeliveryTimestamp: (result as any).estimatedDeliveryTimestamp,
                deliveryDate: (result as any).deliveryDate,
                deliveryDayOfWeek: (result as any).deliveryDayOfWeek,
                packagingType: (result as any).packagingType,
                rateType: (result as any).rateType,
                breakdown: (result as any).breakdown,
              }))}
              isLoading={false}
              isUserLoggedIn={isAuthenticated}
              quoteParams={quoteParams}
              packages={packages}
            />
          </div>
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
    // 'INTERNATIONAL_FIRST': '国際ファースト配送 - プレミアム国際配送サービス', // 除外済み
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