'use client'

import { useState, useEffect, useCallback } from 'react'
import { useShipperInfo, useWaitForHydration, useShippingFormStore } from '@/store/shippingFormStore'
import { GooglePlaceAutocomplete, ParsedAddress } from '@/components/GooglePlaceAutocomplete'
import { usStates, canadianProvinces, japanesePrefectures, getCountryOptions, getPrefectureFromPostalCode } from '@/lib/data/locations'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { AlertCircle, Building2, Loader2 } from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'
import AddressHistoryPicker from '@/components/address/AddressHistoryPicker'
import AddressBookPicker from '@/components/address/AddressBookPicker'

// ストアの値から表示用住所を構築する関数
const buildDisplayAddress = (shipperInfo: any) => {
  console.log('🏗️ buildDisplayAddress called with:', shipperInfo);
  
  // stateCodeの状態をチェック
  if (shipperInfo?.stateCode) {
    console.log('✅ stateCode found:', shipperInfo.stateCode);
  } else {
    console.log('❌ stateCode not found or empty');
  }
  
  const addressParts = [];
  
  if (shipperInfo?.address1) {
    console.log('✅ address1 found:', shipperInfo.address1);
    addressParts.push(shipperInfo.address1);
  } else {
    console.log('❌ address1 not found or empty');
  }
  
  if (shipperInfo?.cityName) {
    console.log('✅ cityName found:', shipperInfo.cityName);
    addressParts.push(shipperInfo.cityName);
  } else {
    console.log('❌ cityName not found or empty');
  }
  
  if (shipperInfo?.postalCode) {
    console.log('✅ postalCode found:', shipperInfo.postalCode);
    addressParts.push(shipperInfo.postalCode);
  } else {
    console.log('❌ postalCode not found or empty');
  }
  
  const result = addressParts.join(', ');
  console.log('🏗️ buildDisplayAddress result:', result);
  return result;
};

export default function ShipperInfoPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const { shipperInfo, updateShipperInfo } = useShipperInfo()
  const { phoenixMode, setPhoenixMode } = useShippingFormStore()
  
  console.log('🔄 ShipperInfoPage render with shipperInfo:', shipperInfo);
  console.log('🔄 Current phoenixMode:', phoenixMode);
  
  // 初期化時にストアから表示用住所を構築
  const [addressInput, setAddressInput] = useState(() => {
    const initialAddress = buildDisplayAddress(shipperInfo);
    console.log('🎯 Initial addressInput set to:', initialAddress);
    return initialAddress;
  })
  const [isAddressSelected, setIsAddressSelected] = useState(() => {
    const hasAddress = !!(shipperInfo?.address1 || shipperInfo?.cityName);
    console.log('🎯 Initial isAddressSelected set to:', hasAddress);
    return hasAddress;
  })
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showAddressBook, setShowAddressBook] = useState(false)
  
  // ハイドレーション完了後に住所フィールドを更新
  useEffect(() => {
    if (isReady && shipperInfo) {
      console.log('🔄 Hydration complete, updating address fields with:', shipperInfo);
      const newAddress = buildDisplayAddress(shipperInfo);
      const hasAddress = !!(shipperInfo.address1 || shipperInfo.cityName);
      
      if (newAddress && newAddress !== addressInput) {
        console.log('🔄 Updating addressInput from', addressInput, 'to', newAddress);
        setAddressInput(newAddress);
        setIsAddressSelected(hasAddress);
      }
    }
  }, [isReady, shipperInfo.address1, shipperInfo.cityName, shipperInfo.postalCode]);

  // stateCodeが空で郵便番号がある場合、郵便番号から都道府県を自動判定
  useEffect(() => {
    if (isReady && shipperInfo && shipperInfo.countryCode === 'JP') {
      console.log('🏢 StateCode auto-detection check:', {
        stateCode: shipperInfo.stateCode,
        postalCode: shipperInfo.postalCode
      });
      
      if (!shipperInfo.stateCode && shipperInfo.postalCode) {
        const detectedStateCode = getPrefectureFromPostalCode(shipperInfo.postalCode);
        if (detectedStateCode) {
          console.log('🏢 Auto-detected stateCode from postal code:', detectedStateCode);
          updateShipperInfo('stateCode', detectedStateCode);
        } else {
          console.log('⚠️ Could not detect stateCode from postal code:', shipperInfo.postalCode);
        }
      }
    }
  }, [isReady, shipperInfo?.stateCode, shipperInfo?.postalCode, shipperInfo?.countryCode]);

  // フェニックスモードで遷移してきた場合、連絡先情報を自動設定
  useEffect(() => {
    console.log('🔥 フェニックスモード useEffect実行:', {
      isReady,
      phoenixMode,
      hasShipperInfo: !!shipperInfo,
      contactName: shipperInfo?.contactName,
      companyName: shipperInfo?.companyName
    });
    
    if (isReady && phoenixMode === 'shipper' && shipperInfo && 
        !shipperInfo.contactName && !shipperInfo.companyName) {
      console.log('🔥 フェニックスモード（荷送人）: 見積もりページから遷移、連絡先情報を自動取得します');
      // 少し遅延してから実行（他のuseEffectの完了を待つ）
      setTimeout(() => {
        handlePhoenixAddressClick();
      }, 100);
    }
  }, [isReady, phoenixMode, shipperInfo?.contactName, shipperInfo?.companyName]);
  
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']
  const countryOptions = getCountryOptions()

  // 住所入力に変更があった場合、選択状態をリセット
  const handleAddressInputChange = (value: string) => {
    console.log('📝 Address input changed to:', value);
    setAddressInput(value)
    setIsAddressSelected(false)
    
    // フェニックスモードのリセット処理
    if (phoenixMode !== 'none') {
      console.log(`🔄 Shipper page: フェニックスモード "${phoenixMode}" → "none" にリセット`)
      
      // フェニックスモードをリセット
      setPhoenixMode('none')
      
      // 荷送人基本情報をクリア（フェニックス情報をリセット）
      updateShipperInfo('contactName', '')
      updateShipperInfo('companyName', '')
      updateShipperInfo('taxId', '')
      updateShipperInfo('phoneNumber', '')
      updateShipperInfo('email', '')
      
      // 荷送人住所情報をクリア
      updateShipperInfo('countryCode', 'JP')
      updateShipperInfo('postalCode', '')
      updateShipperInfo('stateCode', '')
      updateShipperInfo('cityName', '')
      updateShipperInfo('address1', '')
      updateShipperInfo('address2', '')
      
      console.log(`✅ 荷送人の基本情報・住所情報をクリア完了`)
    }
  }

  // フェニックス住所を取得してフォームに自動入力する関数
  const handlePhoenixAddressClick = useCallback(async () => {
    try {
      console.log('🏢 荷送人: フェニックス住所取得開始')
      
      const response = await fetch('/api/phoenix-address')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '自社住所情報の取得に失敗しました')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '自社住所情報の取得に失敗しました')
      }
      
      const companyInfo = data.data
      console.log('✅ 荷送人: フェニックス住所取得成功:', companyInfo)
      
      // フェニックス基本情報を荷送人情報に自動入力
      updateShipperInfo('contactName', companyInfo.contactName || '')
      updateShipperInfo('companyName', companyInfo.companyName || '')
      updateShipperInfo('taxId', companyInfo.taxId || '')
      updateShipperInfo('phoneNumber', companyInfo.phoneNumber || '')
      updateShipperInfo('email', companyInfo.email || '')
      
      // フェニックス住所を荷送人情報に自動入力
      updateShipperInfo('countryCode', 'JP')
      updateShipperInfo('postalCode', companyInfo.postalCode)
      
      // address1を City と Prefecture に分割
      let cityName = companyInfo.address1
      let stateCode = ''
      
      if (companyInfo.address1) {
        const lastSpaceIndex = companyInfo.address1.lastIndexOf(' ')
        if (lastSpaceIndex !== -1) {
          // 最後のスペースで分割
          cityName = companyInfo.address1.substring(0, lastSpaceIndex) // "Toyokawa City"
          const prefecture = companyInfo.address1.substring(lastSpaceIndex + 1) // "Aichi"
          
          console.log(`📍 荷送人: address1を分割: "${companyInfo.address1}" → City: "${cityName}", Prefecture: "${prefecture}"`)
          
          // 県名から県コードを取得（必要に応じて）
          // ここでは簡単のため、郵便番号からの県判定を優先します
        }
      }
      
      updateShipperInfo('cityName', cityName)
      updateShipperInfo('address1', companyInfo.address2 || '') // 番地・建物名
      updateShipperInfo('address2', '')
      
      // 日本の場合、郵便番号から県を自動判定（これが正確）
      if (companyInfo.postalCode) {
        const prefectureFromPostal = getPrefectureFromPostalCode(companyInfo.postalCode)
        if (prefectureFromPostal) {
          stateCode = prefectureFromPostal
          console.log(`📮 荷送人: 郵便番号から県を自動判定: ${companyInfo.postalCode} → ${stateCode}`)
        }
      }
      updateShipperInfo('stateCode', stateCode)
      
      // 表示用の住所文字列を作成
      const displayAddress = `${companyInfo.postalCode} ${companyInfo.address1}${companyInfo.address2 ? ' ' + companyInfo.address2 : ''}`
      setAddressInput(displayAddress)
      setIsAddressSelected(true)
      
      // フェニックス送受取フラグを設定
      setPhoenixMode('shipper')
      
      console.log('🎯 荷送人にフェニックス情報を設定完了（モード: from）', {
        contactName: companyInfo.contactName,
        companyName: companyInfo.companyName,
        phoneNumber: companyInfo.phoneNumber,
        address: displayAddress
      })
      
    } catch (error) {
      console.error('❌ 荷送人: フェニックス住所取得エラー:', error)
      alert(`フェニックス住所の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }, [updateShipperInfo, setPhoenixMode])

  // Google Places APIから住所が選択された場合
  const handleAddressSelect = (data: ParsedAddress) => {
    console.log('📍 Address selected:', data)
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
    if (countryCode !== 'US' && countryCode !== 'CA' && countryCode !== 'JP') {
      updateShipperInfo('stateCode', '')
    }
  }

  // 州・県の選択肢を取得
  const getStateOptions = () => {
    if (shipperInfo.countryCode === 'US') return usStates
    if (shipperInfo.countryCode === 'CA') return canadianProvinces
    if (shipperInfo.countryCode === 'JP') return japanesePrefectures
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
    if ((shipperInfo.countryCode === 'US' || shipperInfo.countryCode === 'CA' || shipperInfo.countryCode === 'JP') && !shipperInfo.stateCode) {
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

  const handleSelectFromHistory = (addr: {
    name?: string
    company?: string
    phone?: string
    email?: string
    country?: string
    zip?: string
    state?: string
    city?: string
    address1?: string
    address2?: string
  }) => {
    updateShipperInfo('contactName', addr.name || '')
    updateShipperInfo('companyName', addr.company || '')
    updateShipperInfo('phoneNumber', addr.phone || '')
    updateShipperInfo('email', addr.email || '')
    updateShipperInfo('countryCode', addr.country || 'JP')
    updateShipperInfo('postalCode', addr.zip || '')
    updateShipperInfo('stateCode', addr.state || '')
    updateShipperInfo('cityName', addr.city || '')
    updateShipperInfo('address1', addr.address1 || '')
    updateShipperInfo('address2', addr.address2 || '')
    // 表示用アドレスと選択状態
    const displayAddress = `${addr.zip ?? ''} ${addr.city ?? ''} ${addr.address1 ?? ''}`.trim()
    setAddressInput(displayAddress)
    setIsAddressSelected(true)
    setShowHistory(false)
  }

  const handleSelectFromAddressBook = (addr: {
    name?: string, name_ascii?: string
    company?: string, company_ascii?: string
    phone?: string, phone_ascii?: string
    email?: string
    country?: string, country_ascii?: string
    zip?: string, zip_ascii?: string
    state?: string, state_ascii?: string
    city?: string, city_ascii?: string
    address1?: string, address1_ascii?: string
    address2?: string, address2_ascii?: string
  }) => {
    // ASCII優先で適用（不足時は原文）
    updateShipperInfo('contactName', addr.name_ascii || addr.name || '')
    updateShipperInfo('companyName', addr.company_ascii || addr.company || '')
    updateShipperInfo('phoneNumber', addr.phone_ascii || addr.phone || '')
    updateShipperInfo('email', addr.email || '')
    updateShipperInfo('countryCode', addr.country_ascii || addr.country || 'JP')
    updateShipperInfo('postalCode', addr.zip_ascii || addr.zip || '')
    updateShipperInfo('stateCode', addr.state_ascii || addr.state || '')
    updateShipperInfo('cityName', addr.city_ascii || addr.city || '')
    updateShipperInfo('address1', addr.address1_ascii || addr.address1 || '')
    updateShipperInfo('address2', addr.address2_ascii || addr.address2 || '')
    const displayAddress = `${addr.zip ?? ''} ${addr.city ?? ''} ${addr.address1 ?? ''}`.trim()
    setAddressInput(displayAddress)
    setIsAddressSelected(true)
    setShowAddressBook(false)
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">荷送人情報</h1>
            <p className="text-sm md:text-base text-gray-600">荷送人の詳細情報を入力してください</p>
          </div>

          {/* ハイドレーション待機ローディング */}
          {isLoading && (
            <Card>
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm md:text-base text-gray-600">フォームを準備中...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* フォーム本体 */}
          {isReady && (
          <Card>
            <CardHeader className="bg-blue-600 text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Building2 className="h-5 w-5 md:h-6 md:w-6" />
                荷送人情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                {/* 基本情報 */}
                <div className="space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">基本情報</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="text-sm md:text-base">
                        担当者名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="contactName"
                        name="contactName"
                        value={shipperInfo.contactName}
                        onChange={handleInputChange}
                        placeholder="田中太郎"
                        required
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-sm md:text-base">
                        会社名
                      </Label>
                      <Input
                        id="companyName"
                        name="companyName"
                        value={shipperInfo.companyName}
                        onChange={handleInputChange}
                        placeholder="株式会社サンプル"
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="taxId" className="text-sm md:text-base">
                        税務番号（法人番号）
                      </Label>
                      <Input
                        id="taxId"
                        name="taxId"
                        value={shipperInfo.taxId}
                        onChange={handleInputChange}
                        placeholder="1234567890123"
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-sm md:text-base">
                        電話番号 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        value={shipperInfo.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="03-1234-5678"
                        required
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm md:text-base">
                      メールアドレス
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={shipperInfo.email}
                      onChange={handleInputChange}
                      placeholder="example@email.com"
                      className="h-11 md:h-10 text-base"
                    />
                  </div>
                </div>

                {/* 住所情報 */}
                <div className="space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">住所情報</h3>

                  {/* 住所自動入力 */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <Label className="text-sm md:text-base">住所検索</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
                        data-test="btn-history-picker"
                      >
                        履歴から入力
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddressBook(true)}
                        className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
                        data-test="btn-addressbook-picker"
                      >
                        保存した宛先から入力
                      </Button>
                      {phoenixMode !== 'recipient' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePhoenixAddressClick}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
                        >
                          🏢 フェニックスから送る
                        </Button>
                      )}
                    </div>
                    
                    <GooglePlaceAutocomplete
                      value={addressInput}
                      onChange={handleAddressInputChange}
                      onPlaceSelect={handleAddressSelect}
                      placeholder="住所を入力すると自動補完されます"
                    />
                  </div>

                  {showHistory && (
                    <AddressHistoryPicker
                      role="shipper"
                      onSelect={handleSelectFromHistory}
                      onClose={() => setShowHistory(false)}
                    />
                  )}
                  {showAddressBook && (
                    <AddressBookPicker
                      role="shipper"
                      onSelect={handleSelectFromAddressBook}
                      onClose={() => setShowAddressBook(false)}
                    />
                  )}

                  {/* 国選択 */}
                  <div className="space-y-2">
                    <Label htmlFor="countryCode" className="text-sm md:text-base">
                      国 <span className="text-red-500">*</span>
                    </Label>
                    <Combobox
                      options={countryOptions}
                      value={shipperInfo.countryCode}
                      onSelect={handleCountryChange}
                      placeholder="国を選択してください"
                      searchPlaceholder="国名または国コードで検索..."
                      emptyText="該当する国が見つかりません"
                    />
                  </div>

                  {/* 州・県選択（US、CA、または日本の場合のみ表示） */}
                  {(shipperInfo.countryCode === 'US' || shipperInfo.countryCode === 'CA' || shipperInfo.countryCode === 'JP') && (
                    <div className="space-y-2">
                      <Label htmlFor="stateCode" className="text-sm md:text-base">
                        州・県 <span className="text-red-500">*</span>
                      </Label>
                      <Select value={shipperInfo.stateCode} onValueChange={(value) => updateShipperInfo('stateCode', value)}>
                        <SelectTrigger className="h-11 md:h-10">
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

                  {/* 詳細住所入力 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-sm md:text-base">
                        郵便番号 {!postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={shipperInfo.postalCode}
                        onChange={handleInputChange}
                        placeholder="100-0001"
                        required={!postalCodeNotRequiredCountries.includes(shipperInfo.countryCode)}
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cityName" className="text-sm md:text-base">
                        都市名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cityName"
                        name="cityName"
                        value={shipperInfo.cityName}
                        onChange={handleInputChange}
                        placeholder="東京"
                        required
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address1" className="text-sm md:text-base">
                      住所1 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address1"
                      name="address1"
                      value={shipperInfo.address1}
                      onChange={handleInputChange}
                      placeholder="千代田区丸の内1-1-1"
                      required
                      className="h-11 md:h-10 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address2" className="text-sm md:text-base">
                      住所2（建物名・部屋番号など）
                    </Label>
                    <Input
                      id="address2"
                      name="address2"
                      value={shipperInfo.address2}
                      onChange={handleInputChange}
                      placeholder="○○ビル 5F"
                      className="h-11 md:h-10 text-base"
                    />
                  </div>
                </div>

                {/* エラーメッセージ */}
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-red-700">{error}</span>
                  </div>
                )}

                {/* ボタン */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/')}
                    className="h-11 md:h-10 text-sm md:text-base font-medium order-2 sm:order-1"
                  >
                    戻る
                  </Button>
                  <Button 
                    type="submit"
                    className="h-11 md:h-10 text-sm md:text-base font-medium bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
                  >
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
