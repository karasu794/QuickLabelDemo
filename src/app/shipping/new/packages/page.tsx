'use client'

import { useRouter } from 'next/navigation'
import { useShippingFormStore, type PackageInfo, useWaitForHydration } from '@/store/shippingFormStore'
import AuthGuard from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useDraftSave } from '@/hooks/useDraftSave'

export default function PackageDetailsForm() {
  const router = useRouter()
  const { isLoading: isHydrationLoading, isReady } = useWaitForHydration()
  const { saveDraft, isLoading, message } = useDraftSave()
  
  // Zustandストアから直接状態とアクションを取得
  const packages = useShippingFormStore((state) => state.packages)
  const addPackage = useShippingFormStore((state) => state.addPackage)
  const updatePackage = useShippingFormStore((state) => state.updatePackage)
  const removePackage = useShippingFormStore((state) => state.removePackage)
  const markStepCompleted = useShippingFormStore((state) => state.markStepCompleted)

  // 荷物情報を更新する関数
  const handlePackageChange = (index: number, field: keyof PackageInfo, value: string) => {
    updatePackage(index, field, value)
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/recipient')
  }

  // フォーム送信ハンドラー（次のページへの遷移のみ）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 荷物詳細ステップを完了としてマーク
    markStepCompleted('/shipping/new/packages')
    router.push('/shipping/new/contents')
  }

  return (
    <AuthGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">荷物の詳細</h1>
          <p className="text-gray-600">荷物の詳細情報を入力してください</p>
        </div>

        {/* ハイドレーション待機ローディング */}
        {isHydrationLoading && (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-600">データを読み込み中...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* フォーム本体 */}
        {isReady && (

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 荷物のリストを.map()でループ処理 */}
          {packages.map((pkg, index) => (
            <div key={index} className="border-2 border-gray-200 bg-white rounded-lg shadow-md">
              <div className="bg-[#4D148C] text-white p-4 rounded-t-lg flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">荷物 {index + 1}</h2>
                  <p className="text-purple-100 text-sm">荷物の詳細情報を入力してください</p>
                </div>
                {packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(index)}
                    className="text-white hover:text-red-200 text-xl font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="space-y-6 p-6">
                {/* Packaging Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    梱包材の種類 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={pkg.type}
                    onChange={(e) => handlePackageChange(index, 'type', e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="YOUR_PACKAGING">お客様ご用意の梱包材</option>
                    <option value="FEDEX_PAK">FedEx Pak</option>
                    <option value="FEDEX_BOX">FedEx Box</option>
                    <option value="FEDEX_ENVELOPE">FedEx Envelope</option>
                    <option value="FEDEX_TUBE">FedEx Tube</option>
                  </select>
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    荷物の重量 (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pkg.weight}
                    onChange={(e) => handlePackageChange(index, 'weight', e.target.value)}
                    placeholder="例: 2.5"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Conditional Dimensions - お客様ご用意の梱包材の場合のみ表示 */}
                {pkg.type === 'YOUR_PACKAGING' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      荷物のサイズ <span className="text-red-500">*</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-600">
                          長さ (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={pkg.length}
                          onChange={(e) => handlePackageChange(index, 'length', e.target.value)}
                          placeholder="例: 30"
                          required={pkg.type === 'YOUR_PACKAGING'}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-600">
                          幅 (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={pkg.width}
                          onChange={(e) => handlePackageChange(index, 'width', e.target.value)}
                          placeholder="例: 20"
                          required={pkg.type === 'YOUR_PACKAGING'}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-600">
                          高さ (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={pkg.height}
                          onChange={(e) => handlePackageChange(index, 'height', e.target.value)}
                          placeholder="例: 15"
                          required={pkg.type === 'YOUR_PACKAGING'}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Another Package Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={addPackage}
              className="w-full p-4 border-2 border-dashed border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C] hover:text-white bg-transparent rounded-lg transition-colors duration-200 font-medium"
            >
              + 別の荷物を追加
            </button>
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
                次へ：内容品 →
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </AuthGuard>
  )
}