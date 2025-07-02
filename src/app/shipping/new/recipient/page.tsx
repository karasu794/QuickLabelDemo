'use client'

import { useRouter } from 'next/navigation'
import { getStatesByCountry } from '@/lib/data/locations'
import { useRecipientInfo, type RecipientInfo } from '@/store/shippingFormStore'

export default function Component() {
  const router = useRouter()
  const { recipientInfo, updateRecipientInfo } = useRecipientInfo()

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
    } else {
      updateRecipientInfo(name as keyof RecipientInfo, value)
    }
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/shipper')
  }

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('荷受人情報:', recipientInfo)
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="w-full bg-white rounded-lg shadow-md">
          <div className="pb-6 p-6">
            <h1 className="text-2xl font-bold text-[#4D148C]">送り状作成 (2/5) - 荷受人情報</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">連絡先情報</h3>

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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス *</label>
                  <input 
                    id="email" 
                    name="email"
                    value={recipientInfo.email}
                    onChange={handleInputChange}
                    type="email" 
                    placeholder="example@company.com" 
                    required 
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
                    都市名 {postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    id="city" 
                    name="cityName"
                    value={recipientInfo.cityName}
                    onChange={handleInputChange}
                    placeholder={postalCodeNotRequiredCountries.includes(recipientInfo.countryCode) ? "Hong Kong" : "東京都千代田区"} 
                    required={postalCodeNotRequiredCountries.includes(recipientInfo.countryCode)}
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
                  <div className="space-y-2">
                    <label htmlFor="address1" className="block text-sm font-medium text-gray-700">住所1 *</label>
                    <input 
                      id="address1" 
                      name="address1"
                      value={recipientInfo.address1}
                      onChange={handleInputChange}
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button 
                type="button"
                onClick={handlePrevious}
                className="flex-1 sm:flex-none sm:w-32 px-4 py-2 border border-gray-300 rounded-md bg-transparent hover:bg-gray-50 transition-colors duration-200"
              >
                前へ
              </button>
              <button 
                type="submit"
                className="flex-1 px-6 py-2 bg-[#4D148C] hover:bg-[#3D0F6B] text-white rounded-md transition-colors duration-200"
              >
                次へ：荷物の詳細
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
