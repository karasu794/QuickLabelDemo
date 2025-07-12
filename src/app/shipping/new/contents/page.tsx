'use client'

import { useRouter } from 'next/navigation'
import { useShippingFormStore, type ItemInfo } from '@/store/shippingFormStore'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { useDraftSave } from '@/hooks/useDraftSave'
import HSCodeAutocomplete from '@/components/HSCodeAutocomplete'
import { useState } from 'react'

export default function ContentsPage() {
  const router = useRouter()
  const { saveDraft, isLoading, message } = useDraftSave()
  
  // Zustandストアから状態とアクションを取得
  const items = useShippingFormStore((state) => state.items)
  const addItem = useShippingFormStore((state) => state.addItem)
  const updateItem = useShippingFormStore((state) => state.updateItem)
  const removeItem = useShippingFormStore((state) => state.removeItem)
  const shippingPurpose = useShippingFormStore((state) => state.shippingPurpose)
  const setShippingPurpose = useShippingFormStore((state) => state.setShippingPurpose)
  const markStepCompleted = useShippingFormStore((state) => state.markStepCompleted)
  const recipientInfo = useShippingFormStore((state) => state.recipientInfo)

  // 品目情報を更新する関数
  const handleItemChange = (index: number, field: keyof ItemInfo, value: string | number) => {
    updateItem(index, field as keyof ItemInfo, value)
  }

  // 品名変更時の処理
  const handleDescriptionChange = (index: number, description: string) => {
    updateItem(index, 'description', description)
  }

  // HSコード変更時の処理
  const handleHSCodeChange = (index: number, hsCode: string) => {
    updateItem(index, 'hsCode', hsCode)
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/packages')
  }

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    markStepCompleted('/shipping/new/contents')
    router.push('/shipping/new/review')
  }

  const countries = [
    { code: 'JP', name: '日本' },
    { code: 'US', name: 'アメリカ' },
    { code: 'CN', name: '中国' },
    { code: 'KR', name: '韓国' },
    { code: 'TW', name: '台湾' },
    { code: 'HK', name: '香港' },
    { code: 'SG', name: 'シンガポール' },
    { code: 'TH', name: 'タイ' },
    { code: 'VN', name: 'ベトナム' },
    { code: 'MY', name: 'マレーシア' },
    { code: 'ID', name: 'インドネシア' },
    { code: 'PH', name: 'フィリピン' },
    { code: 'IN', name: 'インド' },
    { code: 'BD', name: 'バングラデシュ' },
    { code: 'PK', name: 'パキスタン' },
    { code: 'LK', name: 'スリランカ' },
    { code: 'MM', name: 'ミャンマー' },
    { code: 'KH', name: 'カンボジア' },
    { code: 'LA', name: 'ラオス' },
    { code: 'GB', name: 'イギリス' },
    { code: 'FR', name: 'フランス' },
    { code: 'DE', name: 'ドイツ' },
    { code: 'IT', name: 'イタリア' },
    { code: 'ES', name: 'スペイン' },
    { code: 'NL', name: 'オランダ' },
    { code: 'BE', name: 'ベルギー' },
    { code: 'CH', name: 'スイス' },
    { code: 'AT', name: 'オーストリア' },
    { code: 'SE', name: 'スウェーデン' },
    { code: 'NO', name: 'ノルウェー' },
    { code: 'DK', name: 'デンマーク' },
    { code: 'FI', name: 'フィンランド' },
    { code: 'IE', name: 'アイルランド' },
    { code: 'PT', name: 'ポルトガル' },
    { code: 'PL', name: 'ポーランド' },
    { code: 'CZ', name: 'チェコ' },
    { code: 'HU', name: 'ハンガリー' },
    { code: 'RO', name: 'ルーマニア' },
    { code: 'BG', name: 'ブルガリア' },
    { code: 'HR', name: 'クロアチア' },
    { code: 'SI', name: 'スロベニア' },
    { code: 'SK', name: 'スロバキア' },
    { code: 'LT', name: 'リトアニア' },
    { code: 'LV', name: 'ラトビア' },
    { code: 'EE', name: 'エストニア' },
    { code: 'CA', name: 'カナダ' },
    { code: 'MX', name: 'メキシコ' },
    { code: 'AU', name: 'オーストラリア' },
    { code: 'NZ', name: 'ニュージーランド' },
    { code: 'ZA', name: '南アフリカ' },
    { code: 'EG', name: 'エジプト' },
    { code: 'MA', name: 'モロッコ' },
    { code: 'NG', name: 'ナイジェリア' },
    { code: 'KE', name: 'ケニア' },
    { code: 'GH', name: 'ガーナ' },
    { code: 'ET', name: 'エチオピア' },
    { code: 'TZ', name: 'タンザニア' },
    { code: 'UG', name: 'ウガンダ' },
    { code: 'RW', name: 'ルワンダ' },
    { code: 'BR', name: 'ブラジル' },
    { code: 'AR', name: 'アルゼンチン' },
    { code: 'CL', name: 'チリ' },
    { code: 'CO', name: 'コロンビア' },
    { code: 'PE', name: 'ペルー' },
    { code: 'OTHER', name: 'その他' }
  ]

  const shippingPurposeOptions = [
    { value: 'PERSONAL_USE', label: '個人使用' },
    { value: 'GIFT', label: '贈答品' },
    { value: 'SAMPLE', label: 'サンプル' },
    { value: 'REPAIR_AND_RETURN', label: '修理・返送品' },
    { value: 'DOCUMENTS', label: '書類' },
    { value: 'COMMERCIAL', label: '商用・有償' }
  ]

  return (
    <AuthGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            送り状作成 (4/5) - 内容品の詳細
          </h1>
          <p className="text-gray-600">
            税関手続きに必要な内容品の詳細情報を入力してください
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Shipping Purpose */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">発送目的</h2>
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
                <option value="">発送目的を選択してください</option>
                {shippingPurposeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">内容品の詳細</h2>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <span>+</span>
                <span>品目を追加</span>
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">品目 {index + 1}</h3>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeItem(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </Button>
                  )}
                </div>

                <div className="space-y-6 p-6">
                  {/* HSコード自動入力コンポーネント */}
                  <HSCodeAutocomplete
                    description={item.description}
                    hsCode={item.hsCode}
                    destinationCountryCode={recipientInfo.countryCode}
                    onDescriptionChange={(description) => handleDescriptionChange(index, description)}
                    onHSCodeChange={(hsCode) => handleHSCodeChange(index, hsCode)}
                    required={true}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 製造国 */}
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

                    {/* 数量 */}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 重量 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        重量 (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.weight}
                        onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                        placeholder="0.0"
                      />
                    </div>

                    {/* 単価 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        単価 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                        placeholder="0.00"
                      />
                    </div>

                    {/* 通貨 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        通貨 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.currency}
                        onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="JPY">JPY (日本円)</option>
                        <option value="USD">USD (米ドル)</option>
                        <option value="EUR">EUR (ユーロ)</option>
                        <option value="GBP">GBP (英ポンド)</option>
                        <option value="CNY">CNY (中国元)</option>
                        <option value="KRW">KRW (韓国ウォン)</option>
                      </select>
                    </div>
                  </div>

                  {/* 計算値表示 */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="text-sm text-gray-600">
                      合計価値: {(item.unitPrice * item.quantity).toFixed(2)} {item.currency}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 pt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              ← 前のステップ
            </Button>

            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 order-1 sm:order-2">
              {/* Draft Save Button */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => saveDraft()}
                disabled={isLoading}
                className="w-full sm:w-auto text-sm"
              >
                {isLoading ? '保存中...' : '下書き保存'}
              </Button>

              <Button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                次のステップ →
              </Button>
            </div>
          </div>

          {/* Draft Save Message */}
          {message && (
            <div className="text-center">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}
        </form>
      </div>
    </AuthGuard>
  )
} 