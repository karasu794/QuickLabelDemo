'use client'

import { useRouter } from 'next/navigation'
import { useShippingFormStore, type ItemInfo } from '@/store/shippingFormStore'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { useDraftSave } from '@/hooks/useDraftSave'

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

  // 品目情報を更新する関数
  const handleItemChange = (index: number, field: keyof ItemInfo, value: string | number) => {
    updateItem(index, field as keyof ItemInfo, value)
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
    { code: 'CN', name: '中国' },
    { code: 'US', name: 'アメリカ' },
    { code: 'KR', name: '韓国' },
    { code: 'TW', name: '台湾' },
    { code: 'TH', name: 'タイ' },
    { code: 'VN', name: 'ベトナム' },
    { code: 'DE', name: 'ドイツ' },
    { code: 'IT', name: 'イタリア' },
    { code: 'FR', name: 'フランス' },
    { code: 'GB', name: 'イギリス' },
    { code: 'IN', name: 'インド' },
    { code: 'BD', name: 'バングラデシュ' },
    { code: 'PK', name: 'パキスタン' },
    { code: 'ID', name: 'インドネシア' },
    { code: 'MY', name: 'マレーシア' },
    { code: 'PH', name: 'フィリピン' },
    { code: 'SG', name: 'シンガポール' },
    { code: 'MX', name: 'メキシコ' },
    { code: 'TR', name: 'トルコ' },
    { code: 'ES', name: 'スペイン' },
    { code: 'PT', name: 'ポルトガル' },
    { code: 'NL', name: 'オランダ' },
    { code: 'BE', name: 'ベルギー' },
    { code: 'CH', name: 'スイス' },
    { code: 'AT', name: 'オーストリア' },
    { code: 'SE', name: 'スウェーデン' },
    { code: 'NO', name: 'ノルウェー' },
    { code: 'DK', name: 'デンマーク' },
    { code: 'FI', name: 'フィンランド' },
    { code: 'PL', name: 'ポーランド' },
    { code: 'CZ', name: 'チェコ' },
    { code: 'HU', name: 'ハンガリー' },
    { code: 'RO', name: 'ルーマニア' },
    { code: 'BG', name: 'ブルガリア' },
    { code: 'RU', name: 'ロシア' },
    { code: 'CA', name: 'カナダ' },
    { code: 'AU', name: 'オーストラリア' },
    { code: 'NZ', name: 'ニュージーランド' },
    { code: 'ZA', name: '南アフリカ' },
    { code: 'EG', name: 'エジプト' },
    { code: 'IL', name: 'イスラエル' },
    { code: 'AE', name: 'アラブ首長国連邦' },
    { code: 'SA', name: 'サウジアラビア' },
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 内容品リスト */}
          {items.map((item, index) => (
            <div key={index} className="border-2 border-gray-200 bg-white rounded-lg shadow-md">
              <div className="bg-[#4D148C] text-white p-4 rounded-t-lg flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">内容品 {index + 1}</h2>
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
                {/* 品名・説明 */}
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

                {/* HSコード */}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 単価 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      単価 <span className="text-red-500">*</span>
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
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="5000"
                        required
                        className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      />
                    </div>
                  </div>

                  {/* 重量 */}
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
                </div>
              </div>
            </div>
          ))}

          {/* 品目追加ボタン */}
          <div className="pt-4">
            <button
              type="button"
              onClick={addItem}
              className="w-full p-4 border-2 border-dashed border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C] hover:text-white bg-transparent rounded-lg transition-colors duration-200 font-medium flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              別の品目を追加
            </button>
          </div>

          {/* 発送目的セクション */}
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
                  <option value="">目的を選択してください</option>
                  {shippingPurposeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ナビゲーション */}
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
                次へ：最終確認 →
              </button>
            </div>
          </div>
        </form>
      </div>
    </AuthGuard>
  )
} 