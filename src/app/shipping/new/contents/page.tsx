'use client'

import { useRouter } from 'next/navigation'
import { useContents, type ContentItem, useShippingFormStore } from '@/store/shippingFormStore'

export default function ContentsPage() {
  const router = useRouter()
  const { contents, addContent, updateContent, removeContent } = useContents()
  const markStepCompleted = useShippingFormStore((state) => state.markStepCompleted)

  // 内容品情報を更新する関数
  const handleContentChange = (index: number, field: keyof ContentItem, value: string | number) => {
    updateContent(index, field, value)
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/packages')
  }

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('内容品情報:', contents)
    // 内容品情報ステップを完了としてマーク
    markStepCompleted('/shipping/new/contents')
    router.push('/shipping/new/items')
  }

  const countries = [
    { code: 'JP', name: '日本' },
    { code: 'US', name: 'アメリカ' },
    { code: 'CN', name: '中国' },
    { code: 'KR', name: '韓国' },
    { code: 'DE', name: 'ドイツ' },
    { code: 'FR', name: 'フランス' },
    { code: 'GB', name: 'イギリス' },
    { code: 'IT', name: 'イタリア' },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">内容品の詳細</h1>
        <p className="text-gray-600">内容品の詳細情報を入力してください</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 内容品のリストを.map()でループ処理 */}
        {contents.map((item, index) => (
          <div key={index} className="border-2 border-gray-200 bg-white rounded-lg shadow-md">
            <div className="bg-[#4D148C] text-white p-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">内容品 {index + 1}</h2>
                <p className="text-purple-100 text-sm">商品の詳細情報を入力してください</p>
              </div>
              {contents.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContent(index)}
                  className="text-white hover:text-red-200 text-xl font-bold"
                >
                  ×
                </button>
              )}
            </div>
            
            <div className="space-y-6 p-6">
              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  商品名・説明 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleContentChange(index, 'description', e.target.value)}
                  placeholder="例: コットンTシャツ"
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quantity */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleContentChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Value */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    単価 (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.value}
                    onChange={(e) => handleContentChange(index, 'value', parseFloat(e.target.value) || 0)}
                    placeholder="例: 25.00"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weight */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    重量 (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.weight}
                    onChange={(e) => handleContentChange(index, 'weight', parseFloat(e.target.value) || 0)}
                    placeholder="例: 0.25"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Country of Origin */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    原産国 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.countryOfOrigin}
                    onChange={(e) => handleContentChange(index, 'countryOfOrigin', e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* HS Code */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  HSコード（任意）
                </label>
                <input
                  type="text"
                  value={item.hsCode}
                  onChange={(e) => handleContentChange(index, 'hsCode', e.target.value)}
                  placeholder="例: 6109.10"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Another Content Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={addContent}
            className="w-full p-4 border-2 border-dashed border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C] hover:text-white bg-transparent rounded-lg transition-colors duration-200 font-medium"
          >
            + 別の内容品を追加
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6">
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
            次へ：確認・送信 →
          </button>
        </div>
      </form>
    </div>
  )
} 