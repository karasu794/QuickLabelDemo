'use client'

import ResponsiveTable, { TableColumn, TableAction } from '@/components/ResponsiveTable'
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

interface UsersTableHorizontalProps {
  users: UserProfile[]
}

export default function UsersTableHorizontal({ users }: UsersTableHorizontalProps) {
  // テーブル列定義
  const columns: TableColumn[] = [
    {
      key: 'email',
      header: 'メールアドレス',
      width: 'min-w-[200px]',
      className: 'font-medium'
    },
    {
      key: 'full_name',
      header: '担当者名',
      width: 'min-w-[120px]'
    },
    {
      key: 'company_name',
      header: '会社名',
      width: 'min-w-[150px]'
    },
    {
      key: 'created_at',
      header: '登録日',
      width: 'min-w-[100px]',
      className: 'whitespace-nowrap'
    },
    {
      key: 'user_type',
      header: '会員種別',
      width: 'min-w-[100px]'
    }
  ]

  // テーブルアクション定義
  const actions: TableAction[] = [
    {
      label: '詳細',
      onClick: (row: UserProfile) => {
        console.log('ユーザー詳細:', row)
        // 詳細ページへの遷移やモーダル表示など
      },
      className: 'text-blue-600 hover:text-blue-900'
    },
    {
      label: 'メール送信',
      onClick: (row: UserProfile) => {
        if (row.email) {
          window.location.href = `mailto:${row.email}`
        }
      },
      className: 'text-green-600 hover:text-green-900',
      disabled: (row: UserProfile) => !row.email
    }
  ]

  // カスタムセル描画
  const renderCell = (column: TableColumn, row: UserProfile, value: any) => {
    switch (column.key) {
      case 'email':
        return value || '未登録'

      case 'full_name':
        return value || '-'

      case 'company_name':
        return value || '-'

      case 'created_at':
        return formatDate(value)

      case 'user_type':
        const isCompany = row.company_name && row.company_name.trim() !== ''
        return (
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${isCompany 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
            }
          `}>
            {isCompany ? '企業会員' : '個人会員'}
          </span>
        )

      default:
        return value || '-'
    }
  }

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-2">会員一覧（横スクロール対応）</h2>
        <p className="text-sm md:text-base text-gray-600">
          アプローチA: モバイルでは横スクロールで全ての列を確認できます
        </p>
      </div>

      {/* レスポンシブテーブル */}
      <ResponsiveTable
        columns={columns}
        data={users}
        keyField="id"
        actions={actions}
        emptyMessage="登録済みのユーザーはありません"
        renderCell={renderCell}
        showMobileHint={true}
      />
    </div>
  )
} 