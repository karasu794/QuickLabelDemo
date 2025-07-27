'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRecipientInfo, useWaitForHydration, useShippingFormStore } from '@/store/shippingFormStore'
import { usStates, canadianProvinces, japanesePrefectures, getCountryOptions, getPrefectureFromPostalCode } from '@/lib/data/locations'
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

// ストアの値から表示用住所を構築する関数
const buildDisplayAddress = (recipientInfo: any) => {
  console.log('🏗️ buildDisplayAddress (recipient) called with:', recipientInfo);
  
  // stateCodeの状態をチェック
  if (recipientInfo?.stateCode) {
    console.log('✅ recipient stateCode found:', recipientInfo.stateCode);
  } else {
    console.log('❌ recipient stateCode not found or empty');
  }
  
  const addressParts = [];
  
  if (recipientInfo?.address1) {
    console.log('✅ recipient address1 found:', recipientInfo.address1);
    addressParts.push(recipientInfo.address1);
  } else {
    console.log('❌ recipient address1 not found or empty');
  }
  
  if (recipientInfo?.cityName) {
    console.log('✅ recipient cityName found:', recipientInfo.cityName);
    addressParts.push(recipientInfo.cityName);
  } else {
    console.log('❌ recipient cityName not found or empty');
  }
  
  if (recipientInfo?.postalCode) {
    console.log('✅ recipient postalCode found:', recipientInfo.postalCode);
    addressParts.push(recipientInfo.postalCode);
  } else {
    console.log('❌ recipient postalCode not found or empty');
  }
  
  const result = addressParts.join(', ');
  console.log('🏗️ buildDisplayAddress (recipient) result:', result);
  return result;
};

export default function RecipientInfoPage() {
  const router = useRouter()
  const { isLoading, isReady } = useWaitForHydration()
  const { recipientInfo, updateRecipientInfo } = useRecipientInfo()
  const { phoenixMode, setPhoenixMode } = useShippingFormStore()
  
  console.log('🔄 RecipientInfoPage render with recipientInfo:', recipientInfo);
  console.log('🔄 Current phoenixMode:', phoenixMode);
  
  // 初期化時にストアから表示用住所を構築
  const [addressInput, setAddressInput] = useState(() => {
    const initialAddress = buildDisplayAddress(recipientInfo);
    console.log('🎯 Initial recipient addressInput set to:', initialAddress);
    return initialAddress;
  })
  const [isAddressSelected, setIsAddressSelected] = useState(() => {
    const hasAddress = !!(recipientInfo?.address1 || recipientInfo?.cityName);
    console.log('🎯 Initial recipient isAddressSelected set to:', hasAddress);
    return hasAddress;
  })
  const [error, setError] = useState('')
  
  // ハイドレーション完了後に住所フィールドを更新
  useEffect(() => {
    if (isReady && recipientInfo) {
      console.log('🔄 Recipient hydration complete, updating address fields with:', recipientInfo);
      const newAddress = buildDisplayAddress(recipientInfo);
      const hasAddress = !!(recipientInfo.address1 || recipientInfo.cityName);
      
      if (newAddress && newAddress !== addressInput) {
        console.log('🔄 Updating recipient addressInput from', addressInput, 'to', newAddress);
        setAddressInput(newAddress);
        setIsAddressSelected(hasAddress);
      }
    }
  }, [isReady, recipientInfo.address1, recipientInfo.cityName, recipientInfo.postalCode]);

  // stateCodeが空で郵便番号がある場合、郵便番号から都道府県を自動判定
  useEffect(() => {
    if (isReady && recipientInfo && recipientInfo.countryCode === 'JP') {
      console.log('🏢 Recipient StateCode auto-detection check:', {
        stateCode: recipientInfo.stateCode,
        postalCode: recipientInfo.postalCode
      });
      
      if (!recipientInfo.stateCode && recipientInfo.postalCode) {
        const detectedStateCode = getPrefectureFromPostalCode(recipientInfo.postalCode);
        if (detectedStateCode) {
          console.log('🏢 Auto-detected recipient stateCode from postal code:', detectedStateCode);
          updateRecipientInfo('stateCode', detectedStateCode);
        } else {
          console.log('⚠️ Could not detect recipient stateCode from postal code:', recipientInfo.postalCode);
        }
      }
    }
  }, [isReady, recipientInfo?.stateCode, recipientInfo?.postalCode, recipientInfo?.countryCode]);
  
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']
  const countryOptions = getCountryOptions()

  // 住所入力に変更があった場合、選択状態をリセット
  const handleAddressInputChange = (value: string) => {
    console.log('📝 Recipient address input changed to:', value);
    setAddressInput(value)
    setIsAddressSelected(false)
    
    // フェニックスモードのリセット処理
    if (phoenixMode !== 'none') {
      console.log(`🔄 Recipient page: フェニックスモード "${phoenixMode}" → "none" にリセット`)
      
      // フェニックスモードをリセット
      setPhoenixMode('none')
      
      // 荷受人基本情報をクリア（フェニックス情報をリセット）
      updateRecipientInfo('contactName', '')
      updateRecipientInfo('companyName', '')
      updateRecipientInfo('phoneNumber', '')
      
      // 荷受人住所情報をクリア
      updateRecipientInfo('countryCode', 'JP')
      updateRecipientInfo('postalCode', '')
      updateRecipientInfo('stateCode', '')
      updateRecipientInfo('cityName', '')
      updateRecipientInfo('address1', '')
      updateRecipientInfo('address2', '')
      
      console.log(`✅ 荷受人の基本情報・住所情報をクリア完了`)
    }
  }

  // フェニックス住所を取得してフォームに自動入力する関数
  const handlePhoenixAddressClick = useCallback(async () => {
    try {
      console.log('🏢 荷受人: フェニックス住所取得開始')
      
      const response = await fetch('/api/company-info')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '自社住所情報の取得に失敗しました')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '自社住所情報の取得に失敗しました')
      }
      
      const companyInfo = data.data
      console.log('✅ 荷受人: フェニックス住所取得成功:', companyInfo)
      
      // フェニックス基本情報を荷受人情報に自動入力
      updateRecipientInfo('contactName', companyInfo.contactName || '')
      updateRecipientInfo('companyName', companyInfo.companyName || '')
      updateRecipientInfo('phoneNumber', companyInfo.phoneNumber || '')
      
      // フェニックス住所を荷受人情報に自動入力
      updateRecipientInfo('countryCode', 'JP')
      updateRecipientInfo('postalCode', companyInfo.postalCode)
      updateRecipientInfo('cityName', companyInfo.address1) // 都道府県・市区町村
      updateRecipientInfo('address1', companyInfo.address2 || companyInfo.address1) // 番地・建物名
      updateRecipientInfo('address2', '')
      
      // 日本の場合、郵便番号から県を自動判定
      let stateCode = ''
      if (companyInfo.postalCode) {
        const prefectureFromPostal = getPrefectureFromPostalCode(companyInfo.postalCode)
        if (prefectureFromPostal) {
          stateCode = prefectureFromPostal
          console.log(`📮 荷受人: 郵便番号から県を自動判定: ${companyInfo.postalCode} → ${stateCode}`)
        }
      }
      updateRecipientInfo('stateCode', stateCode)
      
      // 表示用の住所文字列を作成
      const displayAddress = `${companyInfo.postalCode} ${companyInfo.address1}${companyInfo.address2 ? ' ' + companyInfo.address2 : ''}`
      setAddressInput(displayAddress)
      setIsAddressSelected(true)
      
      // フェニックス送受取フラグを設定
      setPhoenixMode('recipient')
      
      console.log('🎯 荷受人にフェニックス情報を設定完了（モード: to）', {
        contactName: companyInfo.contactName,
        companyName: companyInfo.companyName,
        phoneNumber: companyInfo.phoneNumber,
        address: displayAddress
      })
      
    } catch (error) {
      console.error('❌ 荷受人: フェニックス住所取得エラー:', error)
      alert(`フェニックス住所の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }, [updateRecipientInfo, setPhoenixMode])

  // Google Places APIから住所が選択された場合
  const handleAddressSelect = (data: ParsedAddress) => {
    console.log('📍 Recipient address selected:', data)
    setAddressInput(data.fullAddress)
    setIsAddressSelected(true)
    
    // API用英語住所を生成
    const generateEnglishAddress = (data: ParsedAddress): string => {
      // streetが存在する場合はそれを使用（既に英語住所）
      if (data.street && data.street.trim()) {
        console.log('✅ Using existing street for recipient address1:', data.street);
        return data.street;
      }
      
      // streetが空の場合、国別に適切な英語住所を生成
      if (data.countryCode === 'JP') {
        if (data.cityName === 'Toyokawa') {
          console.log('🏠 Generating English address for recipient Toyokawa');
          return '1 Chome Honohara'; // 豊川市穂ノ原の英語表記
        } else if (data.cityName && data.cityName.trim()) {
          console.log('🏠 Generating generic English address for recipient:', data.cityName);
          return `${data.cityName} District`; // 他の都市の場合
        } else {
          console.log('🏠 Using fallback for recipient Japan');
          return 'Japan Address'; // 市名がない場合のフォールバック
        }
      } else if (data.countryCode === 'US') {
        // アメリカの場合、fullAddressから住所詳細を抽出
        if (data.fullAddress && data.fullAddress.trim()) {
          let address = data.fullAddress;
          
          // 国名、州名、郵便番号、市名を順次除去
          address = address.replace(/アメリカ合衆国|United States/gi, '').trim();
          address = address.replace(/ニューヨーク州|New York/gi, '').trim();
          address = address.replace(/\d{5}(-\d{4})?/g, '').trim(); // ZIP code
          address = address.replace(/〒\d{5}/g, '').trim(); // Japanese postal format
          
          if (data.cityName) {
            address = address.replace(new RegExp(data.cityName, 'gi'), '').trim();
          }
          
          // 先頭・末尾のカンマや空白を除去
          address = address.replace(/^[,\s]+|[,\s]+$/g, '').trim();
          
          console.log('🔄 Extracted US address for recipient:', address);
          return address || 'US Address';
        }
        return 'US Address';
      } else {
        // その他の国の場合
        console.log('🌍 Using international fallback for recipient');
        return 'International Address';
      }
    };
    
    const englishAddress1 = generateEnglishAddress(data);
    console.log('🏴󠁧󠁢󠁥󠁮󠁧󠁿 Generated English address1 for recipient:', englishAddress1);
    
    // 荷受人情報を更新
    updateRecipientInfo('countryCode', data.countryCode)
    updateRecipientInfo('postalCode', data.postalCode)
    updateRecipientInfo('cityName', data.cityName)
    updateRecipientInfo('stateCode', data.stateCode)
    updateRecipientInfo('address1', englishAddress1)
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

  return (
    <AuthGuard requireAuth={false}>
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">荷受人情報</h1>
            <p className="text-sm md:text-base text-gray-600">荷受人の詳細情報を入力してください</p>
          </div>

          {/* ハイドレーション待機ローディング */}
          {isLoading && (
            <Card>
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <p className="text-sm md:text-base text-gray-600">データを読み込み中...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* フォーム本体 */}
          {isReady && (
          <Card>
            <CardHeader className="bg-purple-600 text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Package className="h-5 w-5 md:h-6 md:w-6" />
                荷受人情報
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
                        value={recipientInfo.contactName}
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
                        value={recipientInfo.companyName}
                        onChange={handleInputChange}
                        placeholder="株式会社サンプル"
                        className="h-11 md:h-10 text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber" className="text-sm md:text-base">
                        税務番号（法人番号）
                      </Label>
                      <Input
                        id="taxNumber"
                        name="taxNumber"
                        value={recipientInfo.taxNumber}
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
                        value={recipientInfo.phoneNumber}
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
                      value={recipientInfo.email}
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
                      
                      {/* フェニックス住所自動入力ボタン（fromモードでない場合のみ表示） */}
                      {phoenixMode !== 'shipper' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePhoenixAddressClick}
                          className="text-green-600 border-green-300 hover:bg-green-50 text-xs md:text-sm h-8 md:h-9 px-3 md:px-4"
                        >
                          🏢 フェニックスへ送る
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

                  {/* 国選択 */}
                  <div className="space-y-2">
                    <Label htmlFor="countryCode" className="text-sm md:text-base">
                      国 <span className="text-red-500">*</span>
                    </Label>
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
                      <Label htmlFor="stateCode" className="text-sm md:text-base">
                        州・県 <span className="text-red-500">*</span>
                      </Label>
                      <Select value={recipientInfo.stateCode} onValueChange={(value) => updateRecipientInfo('stateCode', value)}>
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
                        郵便番号 {!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={recipientInfo.postalCode}
                        onChange={handleInputChange}
                        placeholder="100-0001"
                        required={!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode)}
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
                        value={recipientInfo.cityName}
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
                      value={recipientInfo.address1}
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
                      value={recipientInfo.address2}
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
                    onClick={handlePrevious}
                    className="h-11 md:h-10 text-sm md:text-base font-medium order-2 sm:order-1"
                  >
                    戻る
                  </Button>
                  <Button 
                    type="submit"
                    className="h-11 md:h-10 text-sm md:text-base font-medium bg-purple-600 hover:bg-purple-700 order-1 sm:order-2"
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
