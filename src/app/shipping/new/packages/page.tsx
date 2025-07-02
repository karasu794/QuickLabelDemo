'use client'

import { useRouter } from 'next/navigation'
import { usePackages, type PackageInfo } from '@/store/shippingFormStore'

export default function PackageDetailsForm() {
  const router = useRouter()
  const { packages, addPackage, updatePackage, removePackage } = usePackages()

  // 荷物情報を更新する関数
  const handlePackageChange = (index: number, field: keyof PackageInfo, value: string) => {
    updatePackage(index, field, value)
  }

  // 前へボタンハンドラー
  const handlePrevious = () => {
    router.push('/shipping/new/recipient')
  }

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('荷物情報:', packages)
    router.push('/shipping/new/contents')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">送り状作成 (3/5)</h1>
          <p className="text-gray-600">荷物の詳細</p>
        </div>

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
              次へ：内容品 →
            </button>
          </div>
        </form>

        {/* Progress Indicator */}
        <div className="flex justify-center pt-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#4D148C]"></div>
            <div className="w-3 h-3 rounded-full bg-[#4D148C]"></div>
            <div className="w-3 h-3 rounded-full bg-[#4D148C]"></div>
            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          </div>
        </div>
      </div>
    </div>
  )
}