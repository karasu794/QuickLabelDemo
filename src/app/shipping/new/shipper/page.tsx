'use client'

import { useRouter } from 'next/navigation'
import { getStatesByCountry } from '@/lib/data/locations'
import { useShippingFormStore, type ShipperInfo } from '@/store/shippingFormStore'
import { AddressAutocomplete, parseAddressComponents } from '@/components/AddressAutocomplete'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { useDraftSave } from '@/hooks/useDraftSave'

export default function ShipperInfoPage() {
  const router = useRouter()
  const { saveDraft, isLoading, message } = useDraftSave()
  
  // Zustandストアから直接状態とアクションを取得
  const shipperInfo = useShippingFormStore((state) => state.shipperInfo)
  const updateShipperInfo = useShippingFormStore((state) => state.updateShipperInfo)

  // 郵便番号が不要で都市名が必要な国のリスト
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']

  // フォーム入力値変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // 国コードが変更された場合、州コードと都市名をリセット
    if (name === 'countryCode') {
      updateShipperInfo('countryCode', value)
      updateShipperInfo('stateCode', '')
      updateShipperInfo('cityName', '')
      updateShipperInfo('address1', '')
      updateShipperInfo('address2', '')
      updateShipperInfo('postalCode', '')
    } else {
      updateShipperInfo(name as keyof ShipperInfo, value)
    }
  }

  // 住所選択時のハンドラー（英語版）
  const handleAddressSelect = (place: google.maps.places.PlaceResult) => {
    // Google Maps APIから選択された住所を解析して各フィールドに設定
    const parsed = parseAddressComponents(place, true) // 英語モードで解析
    
    if (parsed.postalCode) {
      updateShipperInfo('postalCode', parsed.postalCode)
    }
    
    // 英語版の住所情報を優先的に使用
    if (parsed.formattedAddressEn) {
      // 西洋式の住所形式に合わせて設定
      const cleanAddress = parsed.formattedAddressEn.replace(/^(日本、|Japan,?\s*)/i, '')
      updateShipperInfo('address1', cleanAddress)
    } else if (place.formatted_address) {
      const cleanAddress = place.formatted_address.replace(/^(日本、|Japan,?\s*)/i, '')
      updateShipperInfo('address1', cleanAddress)
    }
    
    // 都市名の設定（英語版を優先）
    if (parsed.cityEn) {
      updateShipperInfo('cityName', parsed.cityEn)
    } else if (parsed.city) {
      updateShipperInfo('cityName', parsed.city)
    }
    
    // 州コードの設定（該当する場合）
    if (shipperInfo.countryCode === 'JP' && parsed.prefectureEn) {
      // 日本の都道府県コードマッピング（必要に応じて追加）
      const prefectureMap: { [key: string]: string } = {
        'Tokyo': 'TK',
        'Tokyo Metropolis': 'TK',
        'Osaka': 'OS',
        'Osaka Prefecture': 'OS',
        // 他の都道府県も必要に応じて追加
      }
      const stateCode = prefectureMap[parsed.prefectureEn] || ''
      if (stateCode) {
        updateShipperInfo('stateCode', stateCode)
      }
    }
  }

  // 郵便番号選択時のハンドラー
  const handlePostalCodeSelect = (place: google.maps.places.PlaceResult) => {
    const parsed = parseAddressComponents(place, true)
    if (parsed.postalCode) {
      updateShipperInfo('postalCode', parsed.postalCode)
    }
    // 郵便番号から取得した住所情報も自動設定
    handleAddressSelect(place)
  }

  // フォーム送信ハンドラー（次のページへの遷移のみ）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/shipping/new/recipient')
  }

  return (
    <AuthGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">荷送人情報 / Shipper Information</h1>
          <p className="text-gray-600">荷送人の詳細情報を入力してください / Enter shipper details</p>
        </div>

        {/* メインフォーム */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
            <h2 className="text-xl font-semibold">荷送人情報 / Shipper Information</h2>
            <p className="text-purple-100 text-sm">FedEx APIに送信する情報は英語で入力してください / Please enter information in English for FedEx API</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">基本情報 / Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 担当者名 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    担当者名 / Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={shipperInfo.contactName}
                    onChange={handleInputChange}
                    placeholder="Taro Yamada"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">※ ローマ字で入力 / Enter in Roman letters</p>
                </div>

                {/* 会社名 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    会社名 / Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={shipperInfo.companyName}
                    onChange={handleInputChange}
                    placeholder="Sample Corporation"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">※ 英語で入力 / Enter in English</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 納税者番号 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    納税者番号 / Tax ID
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={shipperInfo.taxId}
                    onChange={handleInputChange}
                    placeholder="T1234567890123"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 電話番号 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    電話番号 / Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={shipperInfo.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+81-3-1234-5678"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">※ 国際電話番号形式 / International format</p>
                </div>
              </div>
            </div>

            {/* 住所情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">住所情報 / Address Information</h3>

              {/* 国選択 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  国 / Country <span className="text-red-500">*</span>
                </label>
                <select
                  name="countryCode"
                  value={shipperInfo.countryCode}
                  onChange={handleInputChange}
                  required
                  className="w-full max-w-sm p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="JP">Japan (日本)</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="CN">China</option>
                  <option value="KR">South Korea</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="HK">Hong Kong</option>
                  <option value="AE">United Arab Emirates</option>
                  <option value="SG">Singapore</option>
                </select>
              </div>

              {/* 州・県選択（USまたはCAの場合のみ表示） */}
              {(shipperInfo.countryCode === 'US' || shipperInfo.countryCode === 'CA') && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    州・県 / State/Province <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="stateCode"
                    value={shipperInfo.stateCode}
                    onChange={handleInputChange}
                    required
                    className="w-full max-w-sm p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select State/Province --</option>
                    {getStatesByCountry(shipperInfo.countryCode as 'US' | 'CA').map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 郵便番号と都市名（条件付き表示） */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 郵便番号（郵便番号不要国以外で表示） */}
                {!postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      郵便番号 / Postal Code <span className="text-red-500">*</span>
                    </label>
                    <AddressAutocomplete
                      value={shipperInfo.postalCode}
                      onChange={(value) => updateShipperInfo('postalCode', value)}
                      onAddressSelect={handlePostalCodeSelect}
                      placeholder="100-0001"
                      required
                      isPostalCodeField={true}
                      englishMode={true}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* 都市名（郵便番号不要国で表示、または通常の追加フィールドとして） */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    都市名 / City Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cityName"
                    value={shipperInfo.cityName}
                    onChange={handleInputChange}
                    placeholder={postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) ? "Hong Kong" : "Chiyoda-ku"}
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 住所1 - AddressAutocompleteコンポーネントを使用（英語モード） */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  住所1 / Address Line 1 <span className="text-red-500">*</span>
                </label>
                <AddressAutocomplete
                  value={shipperInfo.address1}
                  onChange={(value) => updateShipperInfo('address1', value)}
                  onAddressSelect={handleAddressSelect}
                  placeholder="1-1-1 Marunouchi, Chiyoda-ku, Tokyo"
                  required
                  englishMode={true}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  label=""
                />
                <p className="text-xs text-gray-500">※ 英語で入力 / Enter in English</p>
              </div>

              {/* 住所2 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  住所2（建物名・部屋番号など）/ Address Line 2 (Building, Room, etc.)
                </label>
                <input
                  type="text"
                  name="address2"
                  value={shipperInfo.address2}
                  onChange={handleInputChange}
                  placeholder="ABC Building 5F"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500">※ 英語で入力 / Enter in English</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6">
              {/* 下書き保存ボタン */}
              <div className="flex items-center gap-3">
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

              {/* 次へボタン */}
              <button
                type="submit"
                className="px-8 py-3 bg-[#4D148C] hover:bg-[#3D0F6B] text-white rounded-md transition-colors duration-200"
              >
                次へ：荷受人情報 / Next: Recipient Information
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}
