'use client'

import { useState, useEffect } from 'react'
import { useShipperInfo, useWaitForHydration } from '@/store/shippingFormStore'
import { GooglePlaceAutocomplete, ParsedAddress } from '@/components/GooglePlaceAutocomplete'
import { usStates, canadianProvinces, getPopularCountryOptions } from '@/lib/data/locations'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Building2, Loader2 } from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'

export default function ShipperInfoPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const { shipperInfo, updateShipperInfo } = useShipperInfo()
  const [error, setError] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [isAddressSelected, setIsAddressSelected] = useState(false)
  
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']
  // const countryOptions = getPopularCountryOptions()
  
  // 一時的に静的リストでテスト
  const countryOptions = [
    { value: 'JP', label: '日本' },
    { value: 'US', label: 'アメリカ合衆国' },
    { value: 'CN', label: '中国' },
    { value: 'KR', label: '韓国' },
    { value: 'TW', label: '台湾' }
  ]

  // 住所入力に変更があった場合、選択状態をリセット
  const handleAddressInputChange = (value: string) => {
    setAddressInput(value)
    setIsAddressSelected(false)
  }

  // Google Places APIから住所が選択された場合
  const handleAddressSelect = (data: ParsedAddress) => {
    console.log('Selected address data:', data)
    setAddressInput(data.fullAddress)
    setIsAddressSelected(true)
    
    // 荷送人情報を更新
    updateShipperInfo('countryCode', data.countryCode)
    updateShipperInfo('postalCode', data.postalCode)
    updateShipperInfo('cityName', data.cityName)
    updateShipperInfo('stateCode', data.stateCode)
    updateShipperInfo('address1', data.street)
  }

  // 通常の入力フィールドの変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateShipperInfo(name as keyof typeof shipperInfo, value)
  }

  // 国が変更された場合、州・県コードをリセット
  const handleCountryChange = (countryCode: string) => {
    updateShipperInfo('countryCode', countryCode)
    if (countryCode !== 'US' && countryCode !== 'CA') {
      updateShipperInfo('stateCode', '')
    }
  }

  // 州・県の選択肢を取得
  const getStateOptions = () => {
    if (shipperInfo.countryCode === 'US') return usStates
    if (shipperInfo.countryCode === 'CA') return canadianProvinces
    return []
  }

  // バリデーション
  const validateForm = () => {
    if (!shipperInfo.contactName.trim()) {
      setError('担当者名を入力してください')
      return false
    }

    if (!shipperInfo.phoneNumber.trim()) {
      setError('電話番号を入力してください')
      return false
    }
    if (!shipperInfo.countryCode) {
      setError('国を選択してください')
      return false
    }
    if (!postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) && !shipperInfo.postalCode.trim()) {
      setError('郵便番号を入力してください')
      return false
    }
    if ((shipperInfo.countryCode === 'US' || shipperInfo.countryCode === 'CA') && !shipperInfo.stateCode) {
      setError('州・県を選択してください')
      return false
    }
    if (!shipperInfo.cityName.trim()) {
      setError('都市名を入力してください')
      return false
    }
    if (!shipperInfo.address1.trim()) {
      setError('住所を入力してください')
      return false
    }
    return true
  }

  // フォーム送信
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (validateForm()) {
      router.push('/shipping/new/recipient')
    }
  }

  useEffect(() => {
    if (shipperInfo.address1) {
      setAddressInput(shipperInfo.address1)
      setIsAddressSelected(true)
    }
  }, [shipperInfo.address1])

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">荷送人情報</h1>
              <p className="text-gray-600">荷送人の詳細情報を入力してください</p>
            </div>

            {/* ハイドレーション待機ローディング（最優先） */}
            {isLoading && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-gray-600">フォームを準備中...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* フォーム本体（ハイドレーション完了後に表示） */}
            {isReady && (
            <Card>
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  荷送人情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 基本情報 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">基本情報</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">担当者名 *</Label>
                        <Input
                          id="contactName"
                          name="contactName"
                          value={shipperInfo.contactName}
                          onChange={handleInputChange}
                          placeholder="田中太郎"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyName">会社名</Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          value={shipperInfo.companyName}
                          onChange={handleInputChange}
                          placeholder="株式会社サンプル"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxId">税務番号（法人番号）</Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={shipperInfo.taxId}
                          onChange={handleInputChange}
                          placeholder="1234567890123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">電話番号 *</Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          value={shipperInfo.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="03-1234-5678"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* 住所情報 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">住所情報</h3>

                    {/* 国選択 */}
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">国 *</Label>
                      <Select value={shipperInfo.countryCode} onValueChange={handleCountryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="国を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 州・県選択（USまたはCAの場合のみ表示） */}
                    {(shipperInfo.countryCode === 'US' || shipperInfo.countryCode === 'CA') && (
                      <div className="space-y-2">
                        <Label htmlFor="stateCode">州・県 *</Label>
                        <Select value={shipperInfo.stateCode} onValueChange={(value) => updateShipperInfo('stateCode', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="州・県を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {getStateOptions().map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 住所自動入力 */}
                    <div className="space-y-2">
                      <Label>住所検索</Label>
                      <GooglePlaceAutocomplete
                        value={addressInput}
                        onChange={handleAddressInputChange}
                        onPlaceSelect={handleAddressSelect}
                        placeholder="住所を入力すると自動補完されます"
                      />
                    </div>

                    {/* 詳細住所入力 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">
                          郵便番号 {!postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={shipperInfo.postalCode}
                          onChange={handleInputChange}
                          placeholder="100-0001"
                          required={!postalCodeNotRequiredCountries.includes(shipperInfo.countryCode)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cityName">都市名 *</Label>
                        <Input
                          id="cityName"
                          name="cityName"
                          value={shipperInfo.cityName}
                          onChange={handleInputChange}
                          placeholder="東京"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address1">住所1 *</Label>
                      <Input
                        id="address1"
                        name="address1"
                        value={shipperInfo.address1}
                        onChange={handleInputChange}
                        placeholder="千代田区丸の内1-1-1"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address2">住所2（建物名・部屋番号など）</Label>
                      <Input
                        id="address2"
                        name="address2"
                        value={shipperInfo.address2}
                        onChange={handleInputChange}
                        placeholder="○○ビル 5F"
                      />
                    </div>
                  </div>

                  {/* エラーメッセージ */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700">{error}</span>
                    </div>
                  )}

                  {/* ボタン */}
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => router.push('/')}>
                      戻る
                    </Button>
                    <Button type="submit">
                      次へ
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
    </AuthGuard>
  )
}
