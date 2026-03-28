'use client'

import ResponsiveCardTable, { CardColumn, CardAction } from '@/components/ResponsiveCardTable'
import { TrackingNumber, PaymentIdButton } from './TransactionActions'
import toast from 'react-hot-toast'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

// 取引データの型定義
interface Transaction {
  id: string
  created_at: string
  user_email: string | null
  user_name: string | null
  total_amount: number
  currency: string
  tracking_number: string
  payment_id: string
  status: string
  recipient_country: string
  recipient_city: string
  label_url: string | null
}

// 決済ステータス表示用のヘルパー関数
function getStatusBadge(status: string) {
  const statusConfig = {
    created: { label: '作成済み', className: 'bg-green-100 text-green-800' },
    pending: { label: '処理中', className: 'bg-yellow-100 text-yellow-800' },
    failed: { label: '失敗', className: 'bg-red-100 text-red-800' },
    cancelled: { label: 'キャンセル', className: 'bg-gray-100 text-gray-800' }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// 日時フォーマット用のヘルパー関数
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 金額フォーマット用のヘルパー関数
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount)
}

interface TransactionsTableCardProps {
  transactions: Transaction[]
}

export default function TransactionsTableCard({ transactions }: TransactionsTableCardProps) {
  // カード列定義
  const columns: CardColumn[] = [
    {
      key: 'user_name',
      label: 'ユーザー',
      header: 'ユーザー',
      isPrimary: true, // カードタイトルとして使用
      width: 'min-w-[160px]'
    },
    {
      key: 'total_amount',
      label: '請求額',
      header: '請求額',
      isSecondary: true, // カードサブタイトルとして使用
      width: 'min-w-[100px]',
      className: 'font-medium',
      mobileClassName: 'font-semibold text-green-600'
    },
    {
      key: 'created_at',
      label: '作成日時',
      header: '作成日時',
      width: 'min-w-[140px]',
      className: 'whitespace-nowrap'
    },
    {
      key: 'tracking_number',
      label: '追跡番号',
      header: '追跡番号',
      width: 'min-w-[120px]'
    },
    {
      key: 'status',
      label: 'ステータス',
      header: '決済ステータス',
      width: 'min-w-[120px]'
    },
    {
      key: 'destination',
      label: '配送先',
      header: '配送先',
      width: 'min-w-[140px]'
    },
    {
      key: 'user_email',
      label: 'メール',
      header: 'メール',
      hideOnMobile: true, // モバイルカードでは非表示
      width: 'min-w-[180px]'
    }
  ]

  // カードアクション定義
  const actions: CardAction[] = [
    {
      label: '追跡',
      onClick: (row: Transaction) => {
        if (IS_DEMO) { toast('操作デモ 本番ではFedEx追跡ページに遷移します', { icon: '✅' }); return }
        window.open(`https://www.fedex.com/fedextrack/?trknbr=${row.tracking_number}`, '_blank')
      },
      className: 'text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )
    },
    {
      label: 'ラベル',
      onClick: (row: Transaction) => {
        if (IS_DEMO) { toast('操作デモ 本番では発行したラベルを再表示します', { icon: '✅' }); return }
        if (row.label_url) {
          window.open(row.label_url, '_blank')
        }
      },
      className: 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100',
      disabled: (row: Transaction) => !IS_DEMO && !row.label_url,
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'キャンセル',
      onClick: async (row: Transaction) => {
        if (IS_DEMO) { toast('操作デモ 本番では取引のキャンセル処理を行います', { icon: '✅' }); return }
        // 確認ダイアログ
        const confirmCancel = window.confirm(
          `【管理者権限】追跡番号 ${row.tracking_number} の発送をキャンセルし、返金処理を行いますか？\n\nこの操作は取り消すことができません。`
        )

        if (!confirmCancel) {
          return
        }

        try {
          // 管理者キャンセルアクションを動的インポート
          const { adminCancelShipmentAction } = await import('@/app/actions/adminActions')
          
          console.log('🚫 管理者による発送キャンセル・返金処理開始:', row.tracking_number)
          
          const response = await adminCancelShipmentAction(row.tracking_number)
          
          if (response.success) {
            alert(`✅ キャンセル・返金が完了しました: ${response.message}`)
            // ページをリロードして最新状態を反映
            window.location.reload()
          } else {
            alert(`❌ キャンセル・返金に失敗しました: ${response.message}`)
          }
          
        } catch (error) {
          console.error('❌ 管理者キャンセル・返金処理エラー:', error)
          alert('❌ キャンセル・返金処理中にエラーが発生しました')
        }
      },
      className: 'text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100',
      disabled: (row: Transaction) => row.status === 'cancelled' || row.status === 'CANCELED' || row.status === 'CANCELLED',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    {
      label: '決済情報',
      onClick: (row: Transaction) => {
        if (IS_DEMO) { toast('操作デモ 本番では決済IDをコピーします', { icon: '✅' }); return }
        // PaymentIdButtonの機能を実装
        navigator.clipboard.writeText(row.payment_id)
      },
      className: 'text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    }
  ]

  // カスタムセル描画
  const renderCell = (column: CardColumn, row: Transaction, value: any) => {
    switch (column.key) {
      case 'user_name':
        return (
          <div>
            <div className="font-medium text-gray-900">
              {row.user_name || 'ゲストユーザー'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {row.user_email || '未登録'}
            </div>
          </div>
        )

      case 'total_amount':
        return formatCurrency(value)

      case 'created_at':
        return formatDate(value)

      case 'tracking_number':
        return <TrackingNumber trackingNumber={value} />

      case 'status':
        return getStatusBadge(value)

      case 'destination':
        return (
          <div className="flex items-center flex-wrap gap-1">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
              {row.recipient_country}
            </span>
            <span className="text-sm">{row.recipient_city}</span>
          </div>
        )

      case 'user_email':
        return row.user_email || '未登録'

      default:
        return value
    }
  }

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-2">取引一覧（カード対応）</h2>
        <p className="text-sm md:text-base text-gray-600">
          アプローチB: モバイルでは各取引がカード形式で表示されます
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">💻 デスクトップ: テーブル表示</span>
          <span className="bg-green-50 text-green-700 px-2 py-1 rounded">📱 モバイル: カード表示</span>
        </div>
      </div>

      {/* レスポンシブカードテーブル */}
      <ResponsiveCardTable
        columns={columns}
        data={transactions}
        keyField="id"
        actions={actions}
        emptyMessage="取引データがありません"
        renderCell={renderCell}
        cardClassName="hover:shadow-lg transition-shadow duration-200"
      />
    </div>
  )
} 