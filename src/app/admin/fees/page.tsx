'use client'

import { useState, useEffect } from 'react'

interface SettingsResponse {
  service_fee_percentage: number
}

interface UpdateResponse {
  success: boolean
  message: string
  service_fee_percentage: number
}

export default function FeesPage() {
  const [currentFeePercentage, setCurrentFeePercentage] = useState<number>(15)
  const [newFeePercentage, setNewFeePercentage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ページ読み込み時に現在の手数料率を取得
  useEffect(() => {
    fetchCurrentSettings()
  }, [])

  // 現在の設定を取得する関数
  const fetchCurrentSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('設定の取得に失敗しました')
      }

      const data: SettingsResponse = await response.json()
      setCurrentFeePercentage(data.service_fee_percentage)
      setNewFeePercentage(data.service_fee_percentage.toString())
    } catch (error) {
      console.error('設定取得エラー:', error)
      setMessage({
        type: 'error',
        text: '設定の取得に失敗しました'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 手数料率を更新する関数
  const updateFeePercentage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション
    const fee = parseFloat(newFeePercentage)
    if (isNaN(fee)) {
      setMessage({
        type: 'error',
        text: '有効な数値を入力してください'
      })
      return
    }

    if (fee < 0 || fee > 100) {
      setMessage({
        type: 'error',
        text: '手数料率は0%から100%の間で入力してください'
      })
      return
    }

    try {
      setIsUpdating(true)
      setMessage(null)

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fee: fee
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新に失敗しました')
      }

      const data: UpdateResponse = await response.json()
      
      // 成功時の処理
      setCurrentFeePercentage(data.service_fee_percentage)
      setMessage({
        type: 'success',
        text: data.message || '手数料率を正常に更新しました'
      })

      // 5秒後にメッセージを非表示
      setTimeout(() => {
        setMessage(null)
      }, 5000)

    } catch (error) {
      console.error('更新エラー:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '更新に失敗しました'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // メッセージクリア関数
  const clearMessage = () => {
    setMessage(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D148C] mx-auto mb-4"></div>
          <p className="text-gray-600">設定を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">手数料管理</h1>
          <p className="text-gray-600">サービス手数料率の設定を管理します</p>
        </div>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div
          className={`rounded-lg p-4 flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {message.text}
            </p>
          </div>
          <button
            onClick={clearMessage}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 現在の設定表示 */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">現在の設定</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">サービス手数料率</p>
              <p className="text-3xl font-bold text-[#4D148C]">{currentFeePercentage}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">手数料計算例</p>
              <p className="text-lg text-gray-900">
                送料 ¥10,000 → 手数料 ¥{(10000 * currentFeePercentage / 100).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 手数料率更新フォーム */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">手数料率の更新</h2>
          <p className="text-sm text-gray-600 mt-1">新しいサービス手数料率を設定してください</p>
        </div>
        <div className="p-6">
          <form onSubmit={updateFeePercentage} className="space-y-6">
            {/* 手数料率入力 */}
            <div>
              <label htmlFor="feePercentage" className="block text-sm font-medium text-gray-700 mb-2">
                新しい手数料率（%）
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="feePercentage"
                  value={newFeePercentage}
                  onChange={(e) => setNewFeePercentage(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  disabled={isUpdating}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#4D148C] focus:border-[#4D148C] disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="例: 15.5"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                0%から100%の間で入力してください（小数点以下1桁まで）
              </p>
            </div>

            {/* プレビュー計算 */}
            {newFeePercentage && !isNaN(parseFloat(newFeePercentage)) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">変更後の計算例</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>送料 ¥5,000 → 手数料 ¥{(5000 * parseFloat(newFeePercentage) / 100).toLocaleString()}</p>
                  <p>送料 ¥10,000 → 手数料 ¥{(10000 * parseFloat(newFeePercentage) / 100).toLocaleString()}</p>
                  <p>送料 ¥20,000 → 手数料 ¥{(20000 * parseFloat(newFeePercentage) / 100).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 更新ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isUpdating || !newFeePercentage || newFeePercentage === currentFeePercentage.toString()}
                className="px-6 py-3 bg-[#4D148C] text-white rounded-md hover:bg-[#3D0F6B] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    更新中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    手数料率を更新
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setNewFeePercentage(currentFeePercentage.toString())}
                disabled={isUpdating}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-200"
              >
                リセット
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ 重要な注意事項</h3>
        <ul className="text-yellow-800 text-sm space-y-2">
          <li>• 手数料率の変更は即座に適用され、新規作成される送り状に反映されます</li>
          <li>• 既に作成済みの送り状の手数料率は変更されません</li>
          <li>• 手数料率は送料に対して計算されます（商品価格には適用されません）</li>
          <li>• 変更前に十分に確認してから更新してください</li>
        </ul>
      </div>
    </div>
  )
} 