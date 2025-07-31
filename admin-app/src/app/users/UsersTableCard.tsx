'use client'

import ResponsiveCardTable, { CardColumn, CardAction } from '@/components/ResponsiveCardTable'
import { UserProfile } from './page'

// 日時フォーマット用のヘルパー関数
function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

interface UsersTableCardProps {
  users: UserProfile[]
}

export default function UsersTableCard({ users }: UsersTableCardProps) {
  // カード列定義
  const columns: CardColumn[] = [
    {
      key: 'full_name',
      label: '担当者名',
      header: '担当者名',
      isPrimary: true,
      width: 'min-w-[120px]'
    },
    {
      key: 'email',
      label: 'メールアドレス',
      header: 'メールアドレス',
      isSecondary: true,
      width: 'min-w-[200px]'
    },
    {
      key: 'company_name',
      label: '会社名',
      header: '会社名',
      width: 'min-w-[150px]'
    },
    {
      key: 'created_at',
      label: '登録日',
      header: '登録日',
      width: 'min-w-[100px]',
      className: 'whitespace-nowrap'
    },
    {
      key: 'user_type',
      label: '会員種別',
      header: '会員種別',
      width: 'min-w-[100px]'
    }
  ]

  // カードアクション定義
  const actions: CardAction[] = [
    {
      label: '詳細',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: (row: UserProfile) => {
        console.log('ユーザー詳細:', row)
        // 詳細ページへの遷移やモーダル表示など
      },
      className: 'text-blue-600 hover:text-blue-700'
    },
    {
      label: 'メール',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.2a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: (row: UserProfile) => {
        if (row.email) {
          window.location.href = `mailto:${row.email}`
        }
      },
      className: 'text-green-600 hover:text-green-700',
      disabled: (row: UserProfile) => !row.email
    },
    {
      label: 'コピー',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: (row: UserProfile) => {
        const userInfo = `
          担当者名: ${row.full_name || '-'}
          メールアドレス: ${row.email || '-'}
          会社名: ${row.company_name || '-'}
          登録日: ${formatDate(row.created_at)}
        `.trim()
        navigator.clipboard.writeText(userInfo)
        // トースト通知など
        console.log('ユーザー情報をコピーしました')
      },
      className: 'text-purple-600 hover:text-purple-700'
    }
  ]

  // カスタムセル描画
  const renderCell = (column: CardColumn, row: UserProfile, value: any) => {
    switch (column.key) {
      case 'full_name':
        return (
          <div className="flex items-center gap-2">
            {/* ユーザーアバター */}
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="font-medium">{value || '未設定'}</span>
          </div>
        )

      case 'email':
        return (
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span className="text-sm text-gray-600">{value || '未登録'}</span>
          </div>
        )

      case 'company_name':
        return value ? (
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm">{value}</span>
          </div>
        ) : '-'

      case 'created_at':
        return (
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-600">{formatDate(value)}</span>
          </div>
        )

      case 'user_type':
        const isCompany = row.company_name && row.company_name.trim() !== ''
        return (
          <div className="flex items-center gap-2">
            {isCompany ? (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${isCompany 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
              }
            `}>
              {isCompany ? '企業会員' : '個人会員'}
            </span>
          </div>
        )

      default:
        return value || '-'
    }
  }

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-2">会員一覧（カード表示）</h2>
        <p className="text-sm md:text-base text-gray-600">
          アプローチB: モバイルではカード形式で見やすく表示されます
        </p>
      </div>

      {/* レスポンシブカードテーブル */}
      <ResponsiveCardTable
        columns={columns}
        data={users}
        keyField="id"
        actions={actions}
        emptyMessage="登録済みのユーザーはありません"
        renderCell={renderCell}
      />
    </div>
  )
} 