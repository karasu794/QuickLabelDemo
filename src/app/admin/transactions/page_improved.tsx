// 改善版: 決済ステータスと輸送ステータスを分離表示

// 取引データの型定義（改善版）
export interface TransactionImproved {
  id: string
  created_at: string
  user_email: string | null
  user_name: string | null
  total_amount: number
  currency: string
  tracking_number: string
  payment_id: string
  payment_status: string      // 決済ステータス
  shipping_status: string     // 輸送ステータス
  recipient_country: string
  recipient_city: string
  label_url: string | null
  square_location_id: string | null  // Square返金用
  refund_reason: string | null
  square_refund_id: string | null
}

// 決済ステータス表示用のヘルパー関数
function getPaymentStatusBadge(status: string) {
  const statusConfig = {
    pending: { label: '未決済', className: 'bg-gray-100 text-gray-800' },
    processing: { label: '処理中', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: '決済完了', className: 'bg-green-100 text-green-800' },
    failed: { label: '決済失敗', className: 'bg-red-100 text-red-800' },
    refunded: { label: '返金済み', className: 'bg-purple-100 text-purple-800' },
    cancelled: { label: '決済キャンセル', className: 'bg-gray-100 text-gray-800' }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// 輸送ステータス表示用のヘルパー関数
function getShippingStatusBadge(status: string) {
  const statusConfig = {
    draft: { label: '下書き', className: 'bg-gray-100 text-gray-600' },
    created: { label: '送り状作成', className: 'bg-blue-100 text-blue-800' },
    confirmed: { label: '発送確定', className: 'bg-indigo-100 text-indigo-800' },
    in_transit: { label: '輸送中', className: 'bg-yellow-100 text-yellow-800' },
    delivered: { label: '配達完了', className: 'bg-green-100 text-green-800' },
    cancelled: { label: '輸送キャンセル', className: 'bg-red-100 text-red-800' },
    returned: { label: '返送', className: 'bg-orange-100 text-orange-800' }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// キャンセル可能かチェック（改善版）
function isCancellable(transaction: TransactionImproved) {
  // 決済がキャンセル/返金済み、または輸送がキャンセル済みの場合はキャンセル不可
  if (transaction.payment_status === 'refunded' || 
      transaction.payment_status === 'cancelled' ||
      transaction.shipping_status === 'cancelled' ||
      transaction.shipping_status === 'delivered') {
    return false
  }
  
  // 追跡番号が存在し、決済が完了している場合のみキャンセル可能
  return transaction.tracking_number && 
         transaction.payment_status === 'completed'
}

// 改善版テーブル列定義
const columnsImproved: TableColumn[] = [
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
    key: 'payment_status',
    header: '決済状況',
    width: 'min-w-[120px]'
  },
  {
    key: 'shipping_status',
    header: '輸送状況',
    width: 'min-w-[120px]'
  },
  {
    key: 'destination',
    header: '配送先',
    width: 'min-w-[140px]'
  }
]

// 改善版データ取得関数
async function fetchTransactionsImproved(): Promise<{ transactions: TransactionImproved[], stats: Stats, error?: string }> {
  try {
    console.log('🔐 管理者取引データ取得開始（改善版）')

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select(`
        id,
        created_at,
        total_amount,
        tracking_number,
        payment_id,
        payment_status,      -- 新しいフィールド
        shipping_status,     -- 新しいフィールド
        recipient_country,
        recipient_city,
        label_url,
        square_location_id,  -- Square返金用
        refund_reason,
        square_refund_id,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ データ取得エラー:', error)
      throw error
    }

    const formattedTransactions: TransactionImproved[] = data?.map((item: any) => ({
      id: item.id,
      created_at: item.created_at,
      user_email: item.profiles?.email || null,
      user_name: item.profiles?.full_name || null,
      total_amount: item.total_amount || 0,
      currency: 'JPY',
      tracking_number: item.tracking_number,
      payment_id: item.payment_id,
      payment_status: item.payment_status || 'pending',    // 新しいフィールド
      shipping_status: item.shipping_status || 'draft',    // 新しいフィールド
      recipient_country: item.recipient_country,
      recipient_city: item.recipient_city,
      label_url: item.label_url,
      square_location_id: item.square_location_id,
      refund_reason: item.refund_reason,
      square_refund_id: item.square_refund_id
    })) || []

    // 統計データの計算（改善版）
    const stats: Stats = {
      totalTransactions: formattedTransactions.length,
      totalRevenue: formattedTransactions
        .filter(t => t.payment_status === 'completed')
        .reduce((sum, t) => sum + t.total_amount, 0),
      completedTransactions: formattedTransactions
        .filter(t => t.shipping_status === 'delivered').length,
      internationalShipments: formattedTransactions
        .filter(t => t.recipient_country !== 'JP').length
    }

    return { transactions: formattedTransactions, stats }

  } catch (error) {
    console.error('❌ 取引データ取得エラー:', error)
    return { 
      transactions: [], 
      stats: { totalTransactions: 0, totalRevenue: 0, completedTransactions: 0, internationalShipments: 0 },
      error: '取引データの取得に失敗しました' 
    }
  }
} 