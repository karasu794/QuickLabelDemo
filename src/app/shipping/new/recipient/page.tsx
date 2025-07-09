'use client'

import { useRouter } from 'next/navigation'
import { getStatesByCountry } from '@/lib/data/locations'
import { useShippingFormStore, type RecipientInfo } from '@/store/shippingFormStore'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { useDraftSave } from '@/hooks/useDraftSave'

export default function Component() {
  const router = useRouter()
  const { saveDraft, isLoading, message } = useDraftSave()
  
  // Zustandストアから直接状態とアクションを取得
  const recipientInfo = useShippingFormStore((state) => state.recipientInfo)
  const updateRecipientInfo = useShippingFormStore((state) => state.updateRecipientInfo)

  // 郵便番号が不要で都市名が必要な国のリスト
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']

  // フォーム入力値変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // 国コードが変更された場合、州コードと都市名をリセット
    if (name === 'countryCode') {
      updateRecipientInfo('countryCode', value)
      updateRecipientInfo('stateCode', '')
      updateRecipientInfo('cityName', '')
      updateRecipientInfo('address1', '')
      updateRecipientInfo('address2', '')
      updateRecipientInfo('postalCode', '')
    } else {
      updateRecipientInfo(name as keyof RecipientInfo, value)
    }
  }

  // 住所選択時のハンドラー
  const handleAddressSelect = (place: google.maps.places.PlaceResult) => {
    // Google Maps APIから選択された住所を解析して各フィールドに設定
    // ここでは簡易的に住所全体をaddress1に設定
    updateRecipientInfo('address1', place.formatted_address || '')
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/shipper')
  }

  // フォーム送信ハンドラー（次のページへの遷移のみ）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/shipping/new/packages')
  }

  const countries = [
    { value: "JP", label: "日本" },
    { value: "US", label: "アメリカ合衆国" },
    { value: "CA", label: "カナダ" },
    { value: "CN", label: "中国" },
    { value: "KR", label: "韓国" },
    { value: "TW", label: "台湾" },
    { value: "HK", label: "香港" },
    { value: "SG", label: "シンガポール" },
    { value: "TH", label: "タイ" },
    { value: "VN", label: "ベトナム" },
    { value: "MY", label: "マレーシア" },
    { value: "PH", label: "フィリピン" },
    { value: "ID", label: "インドネシア" },
    { value: "AU", label: "オーストラリア" },
    { value: "NZ", label: "ニュージーランド" },
    { value: "GB", label: "イギリス" },
    { value: "DE", label: "ドイツ" },
    { value: "FR", label: "フランス" },
    { value: "IT", label: "イタリア" },
    { value: "ES", label: "スペイン" },
    { value: "NL", label: "オランダ" },
    { value: "BE", label: "ベルギー" },
    { value: "CH", label: "スイス" },
    { value: "AT", label: "オーストリア" },
    { value: "SE", label: "スウェーデン" },
    { value: "NO", label: "ノルウェー" },
    { value: "DK", label: "デンマーク" },
    { value: "FI", label: "フィンランド" },
  ]

  return (
    <AuthGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">荷受人情報</h1>
          <p className="text-gray-600">荷受人の詳細情報を入力してください</p>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
            <h2 className="text-xl font-semibold">荷受人情報</h2>
            <p className="text-purple-100 text-sm">荷受人の詳細情報を入力してください</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">基本情報</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">担当者名 *</label>
                  <input 
                    id="contact-name" 
                    name="contactName"
                    value={recipientInfo.contactName}
                    onChange={handleInputChange}
                    placeholder="山田 太郎" 
                    required 
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">会社名</label>
                  <input 
                    id="company-name" 
                    name="companyName"
                    value={recipientInfo.companyName}
                    onChange={handleInputChange}
                    placeholder="株式会社サンプル" 
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="tax-number" className="block text-sm font-medium text-gray-700">納税者番号/EORI</label>
                <input 
                  id="tax-number" 
                  name="taxNumber"
                  value={recipientInfo.taxNumber}
                  onChange={handleInputChange}
                  placeholder="T12345678901" 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">電話番号 *</label>
                  <input 
                    id="phone" 
                    name="phoneNumber"
                    value={recipientInfo.phoneNumber}
                    onChange={handleInputChange}
                    type="tel" 
                    placeholder="03-1234-5678" 
                    required 
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input 
                    id="email" 
                    name="email"
                    value={recipientInfo.email}
                    onChange={handleInputChange}
                    type="email" 
                    placeholder="example@company.com" 
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">住所情報</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">国 *</label>
                  <select 
                    id="country"
                    name="countryCode"
                    value={recipientInfo.countryCode} 
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">国を選択してください</option>
                    {countries.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700">
                    郵便番号 {!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    id="postal-code" 
                    name="postalCode"
                    value={recipientInfo.postalCode}
                    onChange={handleInputChange}
                    placeholder="100-0001" 
                    required={!postalCodeNotRequiredCountries.includes(recipientInfo.countryCode)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    都市名 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="city" 
                    name="cityName"
                    value={recipientInfo.cityName}
                    onChange={handleInputChange}
                    placeholder={postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) ? "Hong Kong" : "東京都千代田区"} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>

                {/* 州・県選択（USまたはCAの場合のみ表示） */}
                {(recipientInfo.countryCode === 'US' || recipientInfo.countryCode === 'CA') && (
                  <div className="space-y-2">
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">州・県 <span className="text-red-500">*</span></label>
                    <select
                      id="state"
                      name="stateCode"
                      value={recipientInfo.stateCode}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- 州・県を選択してください --</option>
                      {getStatesByCountry(recipientInfo.countryCode as 'US' | 'CA').map(state => (
                        <option key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* 住所1 - AddressAutocompleteコンポーネントを使用 */}
                <div className="space-y-2">
                  <label htmlFor="address1" className="block text-sm font-medium text-gray-700">住所1 *</label>
                  <AddressAutocomplete
                    value={recipientInfo.address1}
                    onChange={(value) => updateRecipientInfo('address1', value)}
                    onAddressSelect={handleAddressSelect}
                    placeholder="丸の内1-1-1"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="address2" className="block text-sm font-medium text-gray-700">住所2</label>
                  <input 
                    id="address2" 
                    name="address2"
                    value={recipientInfo.address2}
                    onChange={handleInputChange}
                    placeholder="ビル名・部屋番号など" 
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6">
              {/* 下書き保存ボタン */}
              <div className="flex items-center gap-3 order-3 sm:order-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveDraft}
                  disabled={isLoading}
                  className="text-gray-600 hover:text-gray-800"
                >
                  {isLoading ? '保存中...' : '下書きとして保存'}
                </Button>
                
                {/* フィードバックメッセージ */}
                {message && (
                  <span className={`text-sm ${
                    message.includes('失敗') ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {message}
                  </span>
                )}
              </div>

              {/* 前へ・次へボタン */}
              <div className="flex flex-col sm:flex-row gap-4 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="order-2 sm:order-1 px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent rounded-md transition-colors duration-200"
                >
                  ← 前へ
                </button>
                <button
                  type="submit"
                  className="order-1 sm:order-2 px-8 py-3 bg-[#4D148C] hover:bg-[#3D0F6B] text-white rounded-md transition-colors duration-200"
                >
                  次へ：荷物の詳細 →
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}
