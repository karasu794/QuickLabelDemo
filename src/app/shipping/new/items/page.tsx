'use client'

import { useRouter } from 'next/navigation'
import { useItems, useShippingPurpose, type ItemInfo } from '@/store/shippingFormStore'

export default function Component() {
  const router = useRouter()
  const { items, addItem, updateItem, removeItem } = useItems()
  const { shippingPurpose, setShippingPurpose } = useShippingPurpose()

  // 品目情報を更新する関数
  const handleItemChange = (index: number, field: keyof ItemInfo, value: string | number) => {
    updateItem(index, field, value)
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/contents')
  }

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('内容品情報:', items)
    console.log('発送目的:', shippingPurpose)
    router.push('/shipping/new/review')
  }

  const countries = [
    { code: 'JP', name: '日本' },
    { code: 'CN', name: '中国' },
    { code: 'US', name: 'アメリカ' },
    { code: 'KR', name: '韓国' },
    { code: 'TW', name: '台湾' },
    { code: 'TH', name: 'タイ' },
    { code: 'VN', name: 'ベトナム' },
    { code: 'DE', name: 'ドイツ' },
    { code: 'IT', name: 'イタリア' },
    { code: 'FR', name: 'フランス' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">送り状作成 (5/5)</h1>
          <p className="text-gray-600">内容品の詳細を入力してください</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>ステップ 5 / 5</span>
            <span>100% 完了</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#4D148C] h-2 rounded-full" style={{ width: "100%" }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 内容品のリストを.map()でループ処理 */}
          {items.map((item, index) => (
            <div key={index} className="border-2 border-gray-200 bg-white rounded-lg shadow-md">
              <div className="bg-[#4D148C] text-white p-4 rounded-t-lg flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">内容品 #{index + 1}</h2>
                  <p className="text-purple-100 text-sm">税関申告のため、正確な情報を入力してください</p>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-white hover:text-red-200 text-xl font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="space-y-6 p-6">
                {/* Item name and description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    品名・説明 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="例：コットンTシャツ、電子機器、書籍など"
                    required
                    className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* HS Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    HSコード
                  </label>
                  <input
                    type="text"
                    value={item.hsCode}
                    onChange={(e) => handleItemChange(index, 'hsCode', e.target.value)}
                    placeholder="例：6109.10.00"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-500">不明な場合は空欄でも構いません</p>
                </div>

                {/* Country of manufacture and Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      製造国 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.countryOfManufacture}
                      onChange={(e) => handleItemChange(index, 'countryOfManufacture', e.target.value)}
                      required
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      数量 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    />
                  </div>
                </div>

                {/* Weight and Value */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      重量 (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={item.weight}
                      onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)}
                      placeholder="0.5"
                      required
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      税関申告価額 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={item.currency}
                        onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                        className="w-20 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="JPY">JPY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="5000"
                        required
                        className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add another item button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={addItem}
              className="w-full sm:w-auto p-4 border-2 border-dashed border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C] hover:text-white bg-transparent rounded-lg transition-colors duration-200 font-medium flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              別の品目を追加
            </button>
          </div>

          {/* Shipping purpose section */}
          <div className="border-2 border-gray-200 bg-white rounded-lg shadow-md">
            <div className="bg-[#4D148C] text-white p-4 rounded-t-lg">
              <h2 className="text-lg font-semibold">発送目的</h2>
              <p className="text-purple-100 text-sm">税関申告のため発送目的を選択してください</p>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  発送目的 <span className="text-red-500">*</span>
                </label>
                <select
                  value={shippingPurpose}
                  onChange={(e) => setShippingPurpose(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">目的を選択</option>
                  <option value="personal">個人使用</option>
                  <option value="gift">贈答品 (ギフト)</option>
                  <option value="commercial">商用 (有償)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6">
            <button
              type="button"
              onClick={handlePrevious}
              className="order-2 sm:order-1 px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent rounded-md transition-colors duration-200"
            >
              前へ
            </button>
            <button
              type="submit"
              className="order-1 sm:order-2 px-8 py-3 bg-[#4D148C] hover:bg-[#3D0F6B] text-white rounded-md transition-colors duration-200"
            >
              次へ：最終確認
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
