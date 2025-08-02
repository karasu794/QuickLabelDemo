'use client'

// 動的レンダリングを強制してSSGの問題を回避
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { TrackingNumber, PaymentIdButton } from './TransactionActions'
import TransactionTableSwitcher from './TransactionTableSwitcher'

// サービスロールキーを使用したSupabase client（サーバーサイド専用）
const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// 取引データの型定義
export interface Transaction {
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

// 統計データの型定義
interface Stats {
  totalTransactions: number
  totalRevenue: number
  completedTransactions: number
  internationalShipments: number
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

// サーバーサイドでの取引データ取得
async function fetchTransactions(): Promise<{ transactions: Transaction[], stats: Stats, error?: string }> {
  try {
    console.log('🔐 管理者取引データ取得開始')

    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase環境変数が設定されていません（ビルド時など）')
      return {
        transactions: [],
        stats: { totalTransactions: 0, totalRevenue: 0, completedTransactions: 0, internationalShipments: 0 },
        error: 'Supabase環境変数が設定されていません'
      }
    }

    // shipmentsテーブルとprofilesテーブルを結合してデータを取得
    const supabaseAdmin = createSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select(`
        id,
        created_at,
        total_amount,
        tracking_number,
        payment_id,
        status,
        recipient_country,
        recipient_city,
        label_url,
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

    console.log(`📊 取得した取引数: ${data?.length || 0}`)

    // データを整形
    const formattedTransactions: Transaction[] = data?.map((item: any) => ({
      id: item.id,
      created_at: item.created_at,
      user_email: item.profiles?.email || null,
              user_name: item.profiles?.full_name || null,
      total_amount: item.total_amount || 0,
      currency: 'JPY', // 現在はJPY固定
      tracking_number: item.tracking_number,
      payment_id: item.payment_id,
      status: item.status,
      recipient_country: item.recipient_country,
      recipient_city: item.recipient_city,
      label_url: item.label_url
    })) || []

    // 統計データの計算
    const stats: Stats = {
      totalTransactions: formattedTransactions.length,
      totalRevenue: formattedTransactions.reduce((sum, t) => sum + t.total_amount, 0),
      completedTransactions: formattedTransactions.filter(t => t.status === 'created').length,
      internationalShipments: formattedTransactions.filter(t => t.recipient_country !== 'JP').length
    }

    console.log('📈 統計情報:', stats)

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

// エラー表示コンポーネント
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <div className="mt-3">
              <Link
                href="/admin/transactions"
                className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
              >
                ページを再読み込み
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 統計ダッシュボードコンポーネント
function StatsDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">総取引数</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">総売上</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">作成済み取引</p>
            <p className="text-2xl font-bold text-gray-900">{stats.completedTransactions.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">国際発送数</p>
            <p className="text-2xl font-bold text-gray-900">{stats.internationalShipments.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// メインページコンポーネント（サーバーコンポーネント）
export default async function TransactionsPage() {
  const { transactions, stats, error } = await fetchTransactions()

  if (error) {
    return <ErrorDisplay error={error} />
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">取引管理</h1>
        <p className="mt-2 text-gray-600">全ての送り状作成取引を管理できます</p>
      </div>

      {/* 統計ダッシュボード */}
      <StatsDashboard stats={stats} />

      {/* 切り替え可能な取引一覧テーブル */}
      <TransactionTableSwitcher transactions={transactions} />
    </div>
  )
} 