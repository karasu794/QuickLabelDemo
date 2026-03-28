'use client'

import ResponsiveTable, { TableColumn, TableAction } from '@/components/ResponsiveTable'
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

interface TransactionsTableHorizontalProps {
  transactions: Transaction[]
}

export default function TransactionsTableHorizontal({ transactions }: TransactionsTableHorizontalProps) {
  // テーブル列定義
  const columns: TableColumn[] = [
    {
      key: 'created_at',
      header: '作成日時',
      width: 'min-w-[140px]',
      className: 'whitespace-nowrap'
    },
    {
      key: 'user_info',
      header: 'ユーザー',
      width: 'min-w-[160px]'
    },
    {
      key: 'total_amount',
      header: '請求額',
      width: 'min-w-[100px]',
      className: 'font-medium'
    },
    {
      key: 'tracking_number',
      header: '追跡番号',
      width: 'min-w-[120px]'
    },
    {
      key: 'status',
      header: '決済ステータス',
      width: 'min-w-[120px]'
    },
    {
      key: 'destination',
      header: '配送先',
      width: 'min-w-[140px]'
    }
  ]

  // テーブルアクション定義
  const actions: TableAction[] = [
    {
      label: '追跡',
      onClick: (row: Transaction) => {
        if (IS_DEMO) { toast('操作デモ 本番ではFedEx追跡ページに遷移します', { icon: '✅' }); return }
        window.open(`https://www.fedex.com/fedextrack/?trknbr=${row.tracking_number}`, '_blank')
      },
      className: 'text-blue-600 hover:text-blue-900'
    },
    {
      label: 'ラベル',
      onClick: (row: Transaction) => {
        if (IS_DEMO) { toast('操作デモ 本番では発行したラベルを再表示します', { icon: '✅' }); return }
        if (row.label_url) {
          window.open(row.label_url, '_blank')
        }
      },
      className: 'text-green-600 hover:text-green-900',
      disabled: (row: Transaction) => !IS_DEMO && !row.label_url
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
      className: 'text-red-600 hover:text-red-900',
      disabled: (row: Transaction) => row.status === 'cancelled' || row.status === 'CANCELED' || row.status === 'CANCELLED'
    }
  ]

  // カスタムセル描画
  const renderCell = (column: TableColumn, row: Transaction, value: any) => {
    switch (column.key) {
      case 'created_at':
        return formatDate(value)

      case 'user_info':
        return (
          <div className="max-w-[160px]">
            <div className="font-medium text-gray-900 truncate">
              {row.user_name || 'ゲストユーザー'}
            </div>
            <div className="text-gray-500 text-xs truncate">
              {row.user_email || '未登録'}
            </div>
          </div>
        )

      case 'total_amount':
        return formatCurrency(value)

      case 'tracking_number':
        return <TrackingNumber trackingNumber={value} />

      case 'status':
        return getStatusBadge(value)

      case 'destination':
        return (
          <div className="max-w-[140px]">
            <div className="flex items-center">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 flex-shrink-0">
                {row.recipient_country}
              </span>
              <span className="truncate text-sm">{row.recipient_city}</span>
            </div>
          </div>
        )

      default:
        return value
    }
  }

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-2">取引一覧（横スクロール対応）</h2>
        <p className="text-sm md:text-base text-gray-600">
          アプローチA: モバイルでは横スクロールで全ての列を確認できます
        </p>
      </div>

      {/* レスポンシブテーブル */}
      <ResponsiveTable
        columns={columns}
        data={transactions}
        keyField="id"
        actions={actions}
        emptyMessage="取引データがありません"
        renderCell={renderCell}
        showMobileHint={true}
      />
    </div>
  )
} 