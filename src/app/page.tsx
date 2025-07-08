// src/app/page.tsx
"use client"

import { useState, useEffect } from "react"
import QuoteFormComponent, { Package, ExtendedQuoteParams } from "@/components/QuoteFormComponent"
import { usStates, canadianProvinces } from "@/lib/data/locations"

const POSTAL_CODE_NOT_REQUIRED_COUNTRIES = ['HK', 'AE', 'SG']

interface QuoteResult {
  serviceType: string
  totalNetFedExCharge: string
  estimatedDeliveryTimestamp?: string
  deliveryDate?: string
  deliveryDayOfWeek?: string
  packagingType: string
  rateType: string
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

    try {
      // Validate required fields
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

      // Call quote API
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `APIエラー: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.rates || data.rates.length === 0) {
        throw new Error("利用可能な配送オプションが見つかりませんでした。条件を確認してください。")
      }

      setQuoteResults(data.rates)

    } catch (err) {
      console.error('Quote request failed:', err)
      setError(err instanceof Error ? err.message : '見積もりの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

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

      {/* Results Section */}
      {quoteResults.length > 0 && (
        <div className="max-w-4xl mx-auto mt-8 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              配送オプション ({quoteResults.length}件)
            </h2>
            <p className="text-gray-600 mb-6">
              以下の配送オプションからお選びください。料金は安い順に表示されています。
            </p>
            <div className="space-y-4">
              {quoteResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{result.serviceType}</h3>
                        {index === 0 && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            最安値
                          </span>
                        )}
                        {result.serviceType.includes('PRIORITY') && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            高速配送
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          梱包材: {result.packagingType} | 料金タイプ: {result.rateType}
                        </p>
                        {result.deliveryDate && (
                          <p className="text-sm text-gray-600">
                            配達予定: {result.deliveryDate}
                            {result.deliveryDayOfWeek && ` (${result.deliveryDayOfWeek})`}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          サービス詳細: {getServiceDescription(result.serviceType)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">
                        ¥{parseInt(result.totalNetFedExCharge).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        税込み
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>ヒント:</strong> 配達速度と料金のバランスを考慮してサービスをお選びください。
                Priority系は速達配送、Economy系は経済配送です。
              </p>
            </div>
          </div>
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