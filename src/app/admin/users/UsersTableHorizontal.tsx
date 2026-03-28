'use client'

import ResponsiveTable, { TableColumn, TableAction } from '@/components/ResponsiveTable'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile } from './page'
import toast from 'react-hot-toast'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

function demoToast(action: string) {
  toast(`操作デモ ${action}を実行しました`, { icon: '✅' })
}

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
  const router = useRouter()
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
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
        if (IS_DEMO) { demoToast('詳細表示'); return }
        console.log('ユーザー詳細:', row)
      },
      className: 'text-blue-600 hover:text-blue-900'
    },
    {
      label: 'メール送信',
      onClick: (row: UserProfile) => {
        if (IS_DEMO) { demoToast('メール送信'); return }
        if (row.email) {
          window.location.href = `mailto:${row.email}`
        }
      },
      className: 'text-green-600 hover:text-green-900',
      disabled: (row: UserProfile) => !row.email
    },
    {
      label: '削除',
      onClick: async (row: UserProfile) => {
        if (IS_DEMO) { demoToast('削除'); return }
        if (!confirm('このユーザーを論理削除します。よろしいですか？')) return
        setBusyIds(prev => new Set(prev).add(row.id))
        try {
          const res = await fetch(`/api/admin/users/${row.id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: '' }) })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || j?.ok !== true) throw new Error(j?.error || 'failed')
        } catch (e) {
          console.error(e)
        } finally {
          setBusyIds(prev => { const n = new Set(prev); n.delete(row.id); return n })
          router.refresh()
        }
      },
      className: 'text-red-600 hover:text-red-900',
      disabled: (row: UserProfile) => busyIds.has(row.id),
      'data-test': 'user-delete' as any
    },
    {
      label: '永久停止',
      onClick: async (row: UserProfile) => {
        if (IS_DEMO) { demoToast('永久停止'); return }
        const reason = prompt('理由（任意）を入力してください') || ''
        if (!confirm('このユーザーを永久停止します。よろしいですか？')) return
        setBusyIds(prev => new Set(prev).add(row.id))
        try {
          const res = await fetch(`/api/admin/users/${row.id}/ban`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || j?.ok !== true) throw new Error(j?.error || 'failed')
        } catch (e) {
          console.error(e)
        } finally {
          setBusyIds(prev => { const n = new Set(prev); n.delete(row.id); return n })
          router.refresh()
        }
      },
      className: 'text-amber-600 hover:text-amber-900',
      disabled: (row: UserProfile) => busyIds.has(row.id),
      'data-test': 'user-ban' as any
    },
    {
      label: '一時停止',
      onClick: async (row: UserProfile) => {
        if (IS_DEMO) { demoToast('一時停止'); return }
        const until = prompt('停止期限を ISO 形式（例: 2025-12-31T15:00:00Z）で入力')
        if (!until) return
        setBusyIds(prev => new Set(prev).add(row.id))
        try {
          const res = await fetch(`/api/admin/users/${row.id}/suspend`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ until, reason: '' }) })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || j?.ok !== true) throw new Error(j?.error || 'failed')
        } catch (e) {
          console.error(e)
        } finally {
          setBusyIds(prev => { const n = new Set(prev); n.delete(row.id); return n })
          router.refresh()
        }
      },
      className: 'text-yellow-700 hover:text-yellow-900',
      disabled: (row: UserProfile) => busyIds.has(row.id),
      'data-test': 'user-suspend' as any
    },
    {
      label: '再開',
      onClick: async (row: UserProfile) => {
        if (IS_DEMO) { demoToast('再開'); return }
        setBusyIds(prev => new Set(prev).add(row.id))
        try {
          const res = await fetch(`/api/admin/users/${row.id}/resume`, { method: 'POST' })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || j?.ok !== true) throw new Error(j?.error || 'failed')
        } catch (e) {
          console.error(e)
        } finally {
          setBusyIds(prev => { const n = new Set(prev); n.delete(row.id); return n })
          router.refresh()
        }
      },
      className: 'text-indigo-600 hover:text-indigo-900',
      disabled: (row: UserProfile) => busyIds.has(row.id),
      'data-test': 'user-resume' as any
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