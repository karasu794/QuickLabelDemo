'use client'

import { useState, useEffect } from 'react'
import UsersTableHorizontal from './UsersTableHorizontal'
import UsersTableCard from './UsersTableCard'

// ユーザーデータの型定義
export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  created_at: string | null
}

type ViewMode = 'horizontal' | 'card'

interface UserTableSwitcherProps {
  users: UserProfile[]
}

export default function UserTableSwitcher({ users }: UserTableSwitcherProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('horizontal')
  const [isClient, setIsClient] = useState(false)

  // クライアントサイドのハイドレーション完了を待つ
  useEffect(() => {
    setIsClient(true)
    
    // ローカルストレージから設定を復元
    const savedViewMode = localStorage.getItem('admin-users-view-mode') as ViewMode
    if (savedViewMode && (savedViewMode === 'horizontal' || savedViewMode === 'card')) {
      setViewMode(savedViewMode)
    }
  }, [])

  // 表示モード変更時にローカルストレージに保存
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode)
    if (isClient) {
      localStorage.setItem('admin-users-view-mode', newMode)
    }
  }

  // 統計データの計算
  const stats = {
    totalUsers: users.length,
    companyUsers: users.filter(u => u.company_name && u.company_name.trim() !== '').length,
    individualUsers: users.filter(u => !u.company_name || u.company_name.trim() === '').length,
    recentUsers: users.filter(u => {
      if (!u.created_at) return false
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      return new Date(u.created_at) > oneWeekAgo
    }).length
  }

  // ハイドレーション完了前はローディング表示
  if (!isClient) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-sm text-gray-600">ユーザーデータを読み込み中...</p>
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
            <h2 className="text-lg font-medium text-gray-900">会員一覧</h2>
            <p className="text-sm text-gray-600 mt-1">
              表示方式を選択して、お好みの形式で会員データを確認できます
            </p>
          </div>
          
          {/* 切り替えボタン */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('horizontal')}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${viewMode === 'horizontal'
                  ? 'bg-white text-purple-600 shadow-sm'
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
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
              ? 'bg-purple-50 border-purple-200 text-purple-700' 
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
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
              : 'bg-gray-50 border-gray-200 text-gray-600'
            }
          `}>
            <div className="flex items-center gap-2 font-medium mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              カード表示
            </div>
            <p>モバイル最適化されたカード形式。個人情報を見やすく整理。</p>
          </div>
        </div>
      </div>

      {/* 選択された表示方式でテーブルを表示 */}
      <div className="transition-all duration-300">
        {viewMode === 'horizontal' ? (
          <UsersTableHorizontal users={users} />
        ) : (
          <UsersTableCard users={users} />
        )}
      </div>

      {/* 会員統計 */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">会員統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{stats.totalUsers}</p>
            <p className="text-xs text-purple-600 mt-1">総会員数</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.companyUsers}</p>
            <p className="text-xs text-blue-600 mt-1">企業会員</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.individualUsers}</p>
            <p className="text-xs text-green-600 mt-1">個人会員</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{stats.recentUsers}</p>
            <p className="text-xs text-orange-600 mt-1">今週の新規</p>
          </div>
        </div>
      </div>
    </div>
  )
} 