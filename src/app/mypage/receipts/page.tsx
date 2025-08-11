'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Download, Eye, AlertCircle, Loader2, Package, CreditCard } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shipment } from '@/types/supabase'

// 動的レンダリングを強制してキャッシュを回避
export const dynamic = 'force-dynamic'

interface TransactionItem {
  id: string
  type: 'shipment'
  trackingNumber: string
  status: string
  totalAmount: number | null
  paymentId: string | null
  createdAt: string
  description: string
}

export default function MypageReceiptsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingReceipts, setGeneratingReceipts] = useState<Set<string>>(new Set())

  const supabase = createClient()

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('[RECEIPTS_PAGE] User not authenticated, redirecting to login')
      router.push('/login?redirect_to=' + encodeURIComponent('/mypage/receipts'))
      return
    }
  }, [authLoading, isAuthenticated, router])

  // 取引履歴を取得
  const fetchTransactions = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // shipmentsテーブルから取得
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .not('payment_id', 'is', null) // 支払いが完了している取引のみ
        .order('created_at', { ascending: false })

      if (shipmentsError) {
        console.error('Error fetching shipments:', shipmentsError)
      }

      // 注意: 以前は open_shipments という別テーブルも参照していましたが、
      // 現在は shipments テーブルのみを使用します

      // データを統合してTransactionItem形式に変換
      const allTransactions: TransactionItem[] = []

      // shipmentsを変換
      if (shipments) {
        shipments.forEach((shipment: Shipment) => {
          allTransactions.push({
            id: shipment.id,
            type: 'shipment',
            trackingNumber: shipment.tracking_number,
            status: shipment.status,
            totalAmount: shipment.total_amount,
            paymentId: shipment.payment_id,
            createdAt: shipment.created_at || '',
            description: `配送サービス (追跡番号: ${shipment.tracking_number})`
          })
        })
      }

      // 注意: 以前は open_shipments のデータも変換していましたが、
      // 現在は shipments テーブルのみを使用するため、この部分は削除されています

      // 作成日時でソート
      allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setTransactions(allTransactions)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('取引履歴の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 領収書を生成してダウンロード
  const handleDownloadReceipt = async (transactionId: string) => {
    try {
      setGeneratingReceipts(prev => new Set(prev).add(transactionId))

      // アクセストークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // アクセストークンがある場合はAuthorizationヘッダーに追加
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(`/api/receipts/${transactionId}?format=pdf`, {
        method: 'GET',
        headers,
        credentials: 'include', // クッキーベースの認証情報を含める
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '領収書の生成に失敗しました')
      }

      // PDFをダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt_${transactionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading receipt:', err)
      alert(err instanceof Error ? err.message : '領収書のダウンロードに失敗しました')
    } finally {
      setGeneratingReceipts(prev => {
        const newSet = new Set(prev)
        newSet.delete(transactionId)
        return newSet
      })
    }
  }

  // 領収書をプレビュー
  const handlePreviewReceipt = async (transactionId: string) => {
    try {
      setGeneratingReceipts(prev => new Set(prev).add(transactionId))

      // アクセストークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // アクセストークンがある場合はAuthorizationヘッダーに追加
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(`/api/receipts/${transactionId}?format=url`, {
        method: 'GET',
        headers,
        credentials: 'include', // クッキーベースの認証情報を含める
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '領収書の生成に失敗しました')
      }

      const data = await response.json()
      if (data.success && data.url) {
        // 新しいタブで開く
        window.open(data.url, '_blank')
      } else {
        throw new Error('領収書URLの取得に失敗しました')
      }
    } catch (err) {
      console.error('Error previewing receipt:', err)
      alert(err instanceof Error ? err.message : '領収書のプレビューに失敗しました')
    } finally {
      setGeneratingReceipts(prev => {
        const newSet = new Set(prev)
        newSet.delete(transactionId)
        return newSet
      })
    }
  }

  // ステータスバッジの色を取得
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'default'
      case 'processing':
      case 'in_progress':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // ステータスの日本語表示
  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '確定済み'
      case 'completed':
        return '完了'
      case 'processing':
        return '処理中'
      case 'in_progress':
        return '進行中'
      case 'cancelled':
        return 'キャンセル'
      case 'created':
        return '作成済み'
      default:
        return status
    }
  }

  // 金額をフォーマット
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '未設定'
    return `¥${amount.toLocaleString()}`
  }

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchTransactions()
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">領収書一覧</h1>
        </div>
        
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">取引履歴を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">領収書一覧</h1>
        </div>
        
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTransactions} variant="outline">
            再試行
          </Button>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">領収書一覧</h1>
        </div>
        
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">領収書を発行できる取引がありません</p>
          <p className="text-sm text-gray-400">
            支払いが完了した取引の領収書をここで確認・ダウンロードできます
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">領収書一覧</h1>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{transaction.description}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      取引ID: {transaction.id}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(transaction.status)}>
                  {getStatusLabel(transaction.status)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">追跡番号</p>
                  <p className="text-sm text-gray-900">{transaction.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">金額</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    {formatAmount(transaction.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">取引日時</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </div>

              {transaction.paymentId && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="h-4 w-4" />
                    <span>支払いID: {transaction.paymentId}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handlePreviewReceipt(transaction.id)}
                  variant="outline"
                  size="sm"
                  disabled={generatingReceipts.has(transaction.id)}
                >
                  {generatingReceipts.has(transaction.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  プレビュー
                </Button>
                
                <Button
                  onClick={() => handleDownloadReceipt(transaction.id)}
                  size="sm"
                  disabled={generatingReceipts.has(transaction.id)}
                >
                  {generatingReceipts.has(transaction.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  ダウンロード
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        {transactions.length}件の取引が見つかりました
      </div>
    </div>
  )
} 