'use client'

import { useState, useEffect } from 'react'
import { Transaction } from './page'
import TransactionsTableHorizontal from './TransactionsTableHorizontal'
import TransactionsTableCard from './TransactionsTableCard'

type ViewMode = 'horizontal' | 'card'

interface TransactionTableSwitcherProps {
  transactions: Transaction[]
}

export default function TransactionTableSwitcher({ transactions }: TransactionTableSwitcherProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('horizontal')
  const [isClient, setIsClient] = useState(false)

  // クライアントサイドのハイドレーション完了を待つ
  useEffect(() => {
    setIsClient(true)
    
    // ローカルストレージから設定を復元
    const savedViewMode = localStorage.getItem('admin-table-view-mode') as ViewMode
    if (savedViewMode && (savedViewMode === 'horizontal' || savedViewMode === 'card')) {
      setViewMode(savedViewMode)
    }
  }, [])

  // 表示モード変更時にローカルストレージに保存
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode)
    if (isClient) {
      localStorage.setItem('admin-table-view-mode', newMode)
    }
  }

  // ハイドレーション完了前はローディング表示
  if (!isClient) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">テーブルを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 表示切り替えコントロール */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">取引一覧</h2>
            <p className="text-sm text-gray-600 mt-1">
              表示方式を選択して、お好みの形式で取引データを確認できます
            </p>
          </div>
          
          {/* 切り替えボタン */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('horizontal')}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${viewMode === 'horizontal'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <span className="hidden sm:inline">テーブル表示</span>
              <span className="sm:hidden">テーブル</span>
            </button>
            
            <button
              onClick={() => handleViewModeChange('card')}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${viewMode === 'card'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="hidden sm:inline">カード表示</span>
              <span className="sm:hidden">カード</span>
            </button>
          </div>
        </div>

        {/* 表示方式の説明 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className={`
            p-3 rounded-lg border transition-colors
            ${viewMode === 'horizontal' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-gray-50 border-gray-200 text-gray-600'
            }
          `}>
            <div className="flex items-center gap-2 font-medium mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17H7m0 0a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2H7m0 0a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2H9m0 0V5" />
              </svg>
              テーブル表示
            </div>
            <p>全ての列を表示。モバイルでは横スクロールで確認。</p>
          </div>
          
          <div className={`
            p-3 rounded-lg border transition-colors
            ${viewMode === 'card' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-gray-50 border-gray-200 text-gray-600'
            }
          `}>
            <div className="flex items-center gap-2 font-medium mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              カード表示
            </div>
            <p>モバイル最適化されたカード形式。読みやすく整理された表示。</p>
          </div>
        </div>
      </div>

      {/* 選択された表示方式でテーブルを表示 */}
      <div className="transition-all duration-300">
        {viewMode === 'horizontal' ? (
          <TransactionsTableHorizontal transactions={transactions} />
        ) : (
          <TransactionsTableCard transactions={transactions} />
        )}
      </div>

      {/* データ統計 */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
            <p className="text-xs text-gray-600">総取引数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {transactions.filter(t => t.status === 'created').length}
            </p>
            <p className="text-xs text-gray-600">作成済み</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {transactions.filter(t => t.recipient_country !== 'JP').length}
            </p>
            <p className="text-xs text-gray-600">国際発送</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              ¥{transactions.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">総売上</p>
          </div>
        </div>
      </div>
    </div>
  )
} 