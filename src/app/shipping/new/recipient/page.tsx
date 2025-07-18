'use client'

import { useState, useEffect } from 'react'
import { useRecipientInfo, useWaitForHydration } from '@/store/shippingFormStore'
import { usStates, canadianProvinces, japanesePrefectures, getCountryOptions } from '@/lib/data/locations'
import { GooglePlaceAutocomplete, ParsedAddress } from '@/components/GooglePlaceAutocomplete'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { AlertCircle, Package, Loader2 } from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'

export default function RecipientInfoPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const { recipientInfo, updateRecipientInfo } = useRecipientInfo()
  const [error, setError] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [isAddressSelected, setIsAddressSelected] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']
  const countryOptions = getCountryOptions()

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
    
    // 荷受人情報を更新
    updateRecipientInfo('countryCode', data.countryCode)
    updateRecipientInfo('postalCode', data.postalCode)
    updateRecipientInfo('cityName', data.cityName)
    updateRecipientInfo('stateCode', data.stateCode)
    updateRecipientInfo('address1', data.street)
  }

  // 通常の入力フィールドの変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateRecipientInfo(name as keyof typeof recipientInfo, value)
  }

  // 国が変更された場合、州・県コードをリセット
  const handleCountryChange = (countryCode: string) => {
    updateRecipientInfo('countryCode', countryCode)
    if (countryCode !== 'US' && countryCode !== 'CA' && countryCode !== 'JP') {
      updateRecipientInfo('stateCode', '')
    }
  }

  // 州・県の選択肢を取得
  const getStateOptions = () => {
    if (recipientInfo.countryCode === 'US') return usStates
    if (recipientInfo.countryCode === 'CA') return canadianProvinces
    if (recipientInfo.countryCode === 'JP') return japanesePrefectures
    return []
  }

  // バリデーション
  const validateForm = () => {
    if (!recipientInfo.contactName.trim()) {
      setError('担当者名を入力してください')
      return false
    }

    if (!recipientInfo.phoneNumber.trim()) {
      setError('電話番号を入力してください')
      return false
    }

    if (!recipientInfo.countryCode) {
      setError('国を選択してください')
      return false
    }
    if (!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) && !recipientInfo.postalCode.trim()) {
      setError('郵便番号を入力してください')
      return false
    }
    if ((recipientInfo.countryCode === 'US' || recipientInfo.countryCode === 'CA' || recipientInfo.countryCode === 'JP') && !recipientInfo.stateCode) {
      setError('州・県を選択してください')
      return false
    }
    if (!recipientInfo.cityName.trim()) {
      setError('都市名を入力してください')
      return false
    }
    if (!recipientInfo.address1.trim()) {
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
      router.push('/shipping/new/packages')
    }
  }

  // 戻るボタン
  const handlePrevious = () => {
    router.push('/shipping/new/shipper')
  }

  // コンポーネントマウント時およびストアデータ変更時の初期化
  useEffect(() => {
    // 既に初期化済みで、明示的にリセットが必要でない場合はスキップ
    if (isInitialized && addressInput) return

    console.log('🔄 Initializing recipient page with enhanced store data:', {
      address1: recipientInfo.address1, // 英語の番地・通り名（API用）
      cityName: recipientInfo.cityName, // 英語化された都市名
      postalCode: recipientInfo.postalCode, // 英語化された郵便番号
      countryCode: recipientInfo.countryCode,
      stateCode: recipientInfo.stateCode
    })
    
    // 見積もりから遷移してきた場合の住所初期化
    // 日本語表示用の住所は別途保持されているため、ここでは英語データから住所を構築
    if (recipientInfo.address1 || recipientInfo.cityName) {
      const addressParts = [];
      
      // 英語の番地・通り名（API用データ）
      if (recipientInfo.address1) {
        addressParts.push(recipientInfo.address1);
      }
      
      // 都市名と郵便番号
      if (recipientInfo.cityName) {
        addressParts.push(recipientInfo.cityName);
      }
      
      if (recipientInfo.postalCode) {
        addressParts.push(recipientInfo.postalCode);
      }
      
      const constructedAddress = addressParts.join(', ');
      
      if (constructedAddress) {
        console.log('📍 Setting initial address from enhanced store data:', constructedAddress)
        console.log('🔧 Address construction details:', {
          street: recipientInfo.address1,
          city: recipientInfo.cityName,
          postal: recipientInfo.postalCode,
          result: constructedAddress
        })
        setAddressInput(constructedAddress)
        setIsAddressSelected(true)
        setIsInitialized(true)
      }
    }
    
    // ストアにデータがない場合も初期化完了とマーク
    if (!isInitialized) {
      console.log('✅ Recipient page initialization completed (no store data)')
      setIsInitialized(true)
    }
  }, [recipientInfo.address1, recipientInfo.cityName, recipientInfo.postalCode, recipientInfo.countryCode, recipientInfo.stateCode, isInitialized, addressInput])

  return (
    <AuthGuard requireAuth={false}>
      <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">荷受人情報</h1>
          <p className="text-gray-600">荷受人の詳細情報を入力してください</p>
        </div>

            {/* ハイドレーション待機ローディング */}
            {isLoading && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-gray-600">データを読み込み中...</p>
          </div>
                </CardContent>
              </Card>
            )}

            {/* フォーム本体 */}
            {isReady && (

            <Card>
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  荷受人情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">基本情報</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                        <Label htmlFor="contactName">担当者名 <span className="text-red-500">*</span></Label>
                        <Input
                          id="contactName"
                    name="contactName"
                    value={recipientInfo.contactName}
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
                    value={recipientInfo.companyName}
                    onChange={handleInputChange}
                    placeholder="株式会社サンプル" 
                  />
                </div>
              </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                        <Label htmlFor="taxNumber">税務番号（法人番号）</Label>
                        <Input
                          id="taxNumber"
                  name="taxNumber"
                  value={recipientInfo.taxNumber}
                  onChange={handleInputChange}
                          placeholder="1234567890123"
                />
              </div>
                <div className="space-y-2">
                        <Label htmlFor="phoneNumber">電話番号 <span className="text-red-500">*</span></Label>
                        <Input
                          id="phoneNumber"
                    name="phoneNumber"
                    value={recipientInfo.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="03-1234-5678" 
                    required 
                  />
                      </div>
                </div>

                <div className="space-y-2">
                      <Label htmlFor="email">メールアドレス</Label>
                      <Input
                    id="email" 
                    name="email"
                        type="email"
                    value={recipientInfo.email}
                    onChange={handleInputChange}
                        placeholder="example@email.com"
                  />
              </div>
            </div>

                  {/* 住所情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">住所情報</h3>

                    {/* 国選択 */}
                <div className="space-y-2">
                      <Label htmlFor="countryCode">国 <span className="text-red-500">*</span></Label>
                      <Combobox
                        options={countryOptions}
                    value={recipientInfo.countryCode} 
                        onSelect={handleCountryChange}
                        placeholder="国を選択してください"
                        searchPlaceholder="国名または国コードで検索..."
                        emptyText="該当する国が見つかりません"
                      />
                    </div>

                    {/* 州・県選択（US、CA、または日本の場合のみ表示） */}
                    {(recipientInfo.countryCode === 'US' || recipientInfo.countryCode === 'CA' || recipientInfo.countryCode === 'JP') && (
                      <div className="space-y-2">
                        <Label htmlFor="stateCode">州・県 <span className="text-red-500">*</span></Label>
                        <Select value={recipientInfo.stateCode} onValueChange={(value) => updateRecipientInfo('stateCode', value)}>
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
                    郵便番号 {!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          id="postalCode"
                    name="postalCode"
                    value={recipientInfo.postalCode}
                    onChange={handleInputChange}
                    placeholder="100-0001" 
                    required={!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode)}
                  />
                </div>
                <div className="space-y-2">
                        <Label htmlFor="cityName">都市名 <span className="text-red-500">*</span></Label>
                        <Input
                          id="cityName"
                    name="cityName"
                    value={recipientInfo.cityName}
                    onChange={handleInputChange}
                          placeholder="東京"
                    required
                  />
                </div>
              </div>

                <div className="space-y-2">
                      <Label htmlFor="address1">住所1 <span className="text-red-500">*</span></Label>
                      <Input
                        id="address1"
                        name="address1"
                    value={recipientInfo.address1}
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
                    value={recipientInfo.address2}
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
                    <Button type="button" variant="outline" onClick={handlePrevious}>
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
