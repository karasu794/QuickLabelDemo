'use client'

import { useRouter } from 'next/navigation'
import { getStatesByCountry } from '@/lib/data/locations'
import { useShippingFormStore, type ShipperInfo } from '@/store/shippingFormStore'

export default function ShipperInfoPage() {
  const router = useRouter()
  
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
    } else {
      updateShipperInfo(name as keyof ShipperInfo, value)
    }
  }

  // フォーム送信ハンドラー（次のページへの遷移のみ）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/shipping/new/recipient')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">送り状作成 (1/5)</h1>
          <p className="text-gray-600">荷送人情報を入力してください</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>ステップ 1 / 5</span>
            <span>20% 完了</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#4D148C] h-2 rounded-full" style={{ width: "20%" }}></div>
          </div>
        </div>

        {/* メインフォーム */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="bg-[#4D148C] text-white p-6 rounded-t-lg">
            <h2 className="text-xl font-semibold">荷送人情報</h2>
            <p className="text-purple-100 text-sm">荷送人の詳細情報を入力してください</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">基本情報</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 担当者名 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    担当者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={shipperInfo.contactName}
                    onChange={handleInputChange}
                    placeholder="山田 太郎"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 会社名 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    会社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={shipperInfo.companyName}
                    onChange={handleInputChange}
                    placeholder="株式会社サンプル"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 納税者番号 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    納税者番号
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
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={shipperInfo.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="03-1234-5678"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 住所情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">住所情報</h3>

              {/* 国選択 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  国 <span className="text-red-500">*</span>
                </label>
                <select
                  name="countryCode"
                  value={shipperInfo.countryCode}
                  onChange={handleInputChange}
                  required
                  className="w-full max-w-sm p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="JP">日本</option>
                  <option value="US">アメリカ</option>
                  <option value="CA">カナダ</option>
                  <option value="CN">中国</option>
                  <option value="KR">韓国</option>
                  <option value="DE">ドイツ</option>
                  <option value="FR">フランス</option>
                  <option value="HK">香港</option>
                  <option value="AE">アラブ首長国連邦</option>
                  <option value="SG">シンガポール</option>
                </select>
              </div>

              {/* 州・県選択（USまたはCAの場合のみ表示） */}
              {(shipperInfo.countryCode === 'US' || shipperInfo.countryCode === 'CA') && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    州・県 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="stateCode"
                    value={shipperInfo.stateCode}
                    onChange={handleInputChange}
                    required
                    className="w-full max-w-sm p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- 州・県を選択してください --</option>
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
                      郵便番号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={shipperInfo.postalCode}
                      onChange={handleInputChange}
                      placeholder="100-0001"
                      required
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* 都市名（郵便番号不要国で表示、または通常の追加フィールドとして） */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    都市名 {postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="cityName"
                    value={shipperInfo.cityName}
                    onChange={handleInputChange}
                    placeholder={postalCodeNotRequiredCountries.includes(shipperInfo.countryCode) ? "Hong Kong" : "東京都"}
                    required={postalCodeNotRequiredCountries.includes(shipperInfo.countryCode)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 住所1 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  住所1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address1"
                  value={shipperInfo.address1}
                  onChange={handleInputChange}
                  placeholder="千代田区丸の内1-1-1"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 住所2 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  住所2（建物名・部屋番号など）
                </label>
                <input
                  type="text"
                  name="address2"
                  value={shipperInfo.address2}
                  onChange={handleInputChange}
                  placeholder="○○ビル 5階"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                className="px-8 py-3 bg-[#4D148C] hover:bg-[#3D0F6B] text-white rounded-md transition-colors duration-200"
              >
                次へ：荷受人情報
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 