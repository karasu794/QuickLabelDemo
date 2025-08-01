'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  Clock, 
  Truck, 
  Globe, 
  DollarSign,
  Repeat,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useShippingFormStore } from '@/store/shippingFormStore'
import CancelShipmentButton from '@/components/CancelShipmentButton'

// 型定義
interface ShipmentHistory {
  id: string
  created_at: string
  tracking_number: string | null
  status: string
  total_amount: number | null
  payment_id: string | null
  label_url: string | null
  shipper_company: string | null
  shipper_contact: string | null
  shipper_phone: string | null
  shipper_postal_code: string | null
  shipper_city: string | null
  shipper_address1: string | null
  shipper_address2: string | null
  shipper_country: string | null
  shipper_state: string | null
  recipient_company: string | null
  recipient_contact: string | null
  recipient_phone: string | null
  recipient_email: string | null
  recipient_country: string | null
  recipient_postal_code: string | null
  recipient_city: string | null
  recipient_address1: string | null
  recipient_address2: string | null
  recipient_state: string | null
  packages: any
  items: any
  contents: any
  shipping_purpose: string | null
}

interface QuoteHistory {
  id: string
  created_at: string
  status: string
  request_payload: any
  response_payload: any
  completed_at: string | null
}

export default function MypageHistoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setInitialShippingInfoFromQuote, resetForm } = useShippingFormStore()
  
  const [loading, setLoading] = useState(true)
  const [shipments, setShipments] = useState<ShipmentHistory[]>([])
  const [quotes, setQuotes] = useState<QuoteHistory[]>([])
  const [error, setError] = useState<string | null>(null)

  // データを取得
  useEffect(() => {
    fetchHistoryData()
  }, [])

  const fetchHistoryData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 現在のユーザーを取得
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('ユーザー認証に失敗しました')
        return
      }

      console.log('📊 履歴データ取得開始:', user.id)

      // 発送履歴を取得（最新50件）
      const { data: shipmentData, error: shipmentError } = await (supabase as any)
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (shipmentError) {
        console.error('❌ 発送履歴取得エラー:', shipmentError)
        throw shipmentError
      }

      // 見積もり履歴を取得（過去30日分、user_id条件追加）
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: quoteData, error: quoteError } = await supabase
        .from('quote_jobs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (quoteError) {
        console.error('❌ 見積もり履歴取得エラー:', quoteError)
        throw quoteError
      }

      console.log('✅ 履歴データ取得完了', {
        shipments: shipmentData?.length || 0,
        quotes: quoteData?.length || 0
      })

      setShipments((shipmentData as ShipmentHistory[]) || [])
      setQuotes((quoteData as QuoteHistory[]) || [])

    } catch (err) {
      console.error('❌ 履歴データ取得エラー:', err)
      setError(err instanceof Error ? err.message : '履歴データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 発送履歴から送り状作成ページに遷移
  const handleReuseShipment = async (shipment: ShipmentHistory) => {
    try {
      console.log('🔄 発送履歴から再利用開始:', shipment.id)

      // Zustandストアをリセット
      resetForm()

      // 送り状データをQuoteParamsに変換
      const quoteParams = {
        originCountry: shipment.shipper_country || 'JP',
        originPostalCode: shipment.shipper_postal_code || '',
        originStateCode: shipment.shipper_state || '',
        originCityName: shipment.shipper_city || '',
        originAddressInput: `${shipment.shipper_address1 || ''} ${shipment.shipper_address2 || ''}`.trim(),
        originStreet: shipment.shipper_address1 || '',
        destinationCountry: shipment.recipient_country || 'US',
        destinationPostalCode: shipment.recipient_postal_code || '',
        destinationStateCode: shipment.recipient_state || '',
        destinationCityName: shipment.recipient_city || '',
        destinationAddressInput: `${shipment.recipient_address1 || ''} ${shipment.recipient_address2 || ''}`.trim(),
        destinationStreet: shipment.recipient_address1 || '',
        isResidential: false, // デフォルト値
        phoenixMode: 'none' as const
      }

      // 荷物情報を変換
      const packages = shipment.packages ? (Array.isArray(shipment.packages) ? shipment.packages : [shipment.packages]) : []

      console.log('🎯 送り状データを変換完了:', { quoteParams, packagesCount: packages.length })

      // Zustandストアに設定
      setInitialShippingInfoFromQuote(quoteParams as any, packages)

      console.log('✅ Zustandストアに設定完了 - 送り状作成ページに遷移')

      // 送り状作成ページに遷移
      router.push('/shipping/new/shipper')

    } catch (err) {
      console.error('❌ 送り状再利用エラー:', err)
      alert('送り状の再利用に失敗しました。もう一度お試しください。')
    }
  }

  // 見積もり履歴から見積もりページに遷移
  const handleReuseQuote = async (quote: QuoteHistory) => {
    try {
      console.log('🔄 見積もり履歴から再利用開始:', quote.id)

      const request = quote.request_payload
      if (!request?.quoteParams) {
        throw new Error('見積もりデータが不正です')
      }

      // Zustandストアをリセット
      resetForm()

      // 見積もりデータをセット
      setInitialShippingInfoFromQuote(request.quoteParams, request.packages || [])

      console.log('✅ 見積もりデータをストアに設定完了 - トップページに遷移')

      // トップページに遷移（見積もりフォーム）
      router.push('/')

    } catch (err) {
      console.error('❌ 見積もり再利用エラー:', err)
      alert('見積もりの再利用に失敗しました。もう一度お試しください。')
    }
  }

  // ステータスバッジの色を取得
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'created':
      case 'shipped':
        return 'default'
      case 'payment_completed':
        return 'secondary'
      case 'pending':
        return 'outline'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // 日本語ステータス表示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待機中'
      case 'processing_auth': return '認証中'
      case 'processing_rate_request': return '料金取得中'
      case 'completed': return '完了'
      case 'failed': return '失敗'
      case 'payment_completed': return '決済完了'
      case 'created': return '作成済み'
      case 'shipped': return '発送済み'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">発送履歴</h1>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">履歴データを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">発送履歴</h1>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchHistoryData}>
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">発送履歴</h1>
      </div>
      
      <Tabs defaultValue="shipments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            発送履歴 ({shipments.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            見積もり履歴 ({quotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                発送履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">まだ発送履歴がありません</p>
                  <Button onClick={() => router.push('/')}>
                    初回発送を開始
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">作成日時</th>
                        <th className="text-left p-4">追跡番号</th>
                        <th className="text-left p-4">荷受人</th>
                        <th className="text-left p-4">仕向国</th>
                        <th className="text-left p-4">金額</th>
                        <th className="text-left p-4">ステータス</th>
                        <th className="text-left p-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((shipment) => (
                        <tr key={shipment.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            {new Date(shipment.created_at).toLocaleString('ja-JP')}
                          </td>
                          <td className="p-4">
                            {shipment.tracking_number ? (
                              <div className="flex items-center gap-2">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {shipment.tracking_number}
                                </code>
                                {shipment.label_url && (
                                  <a href={shipment.label_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{shipment.recipient_contact || '-'}</p>
                              <p className="text-sm text-gray-500">{shipment.recipient_company}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <span>{shipment.recipient_country}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {shipment.total_amount ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span>¥{shipment.total_amount.toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge variant={getStatusBadgeVariant(shipment.status)}>
                              {getStatusText(shipment.status)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReuseShipment(shipment)}
                                className="flex items-center gap-2"
                              >
                                <Repeat className="h-4 w-4" />
                                再度発送
                              </Button>
                              
                              {/* キャンセルボタン */}
                              {shipment.tracking_number && shipment.payment_id && (
                                <CancelShipmentButton
                                  trackingNumber={shipment.tracking_number}
                                  squarePaymentId={shipment.payment_id}
                                  currentStatus={shipment.status}
                                  onSuccess={() => {
                                    // キャンセル成功時にデータを再取得
                                    fetchHistoryData()
                                  }}
                                  className="ml-2"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                見積もり履歴（過去30日）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">まだ見積もり履歴がありません</p>
                  <Button onClick={() => router.push('/')}>
                    見積もりを開始
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">作成日時</th>
                        <th className="text-left p-4">出荷地</th>
                        <th className="text-left p-4">仕向地</th>
                        <th className="text-left p-4">荷物数</th>
                        <th className="text-left p-4">ステータス</th>
                        <th className="text-left p-4">料金数</th>
                        <th className="text-left p-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => {
                        const request = quote.request_payload?.quoteParams
                        const response = quote.response_payload
                        const packages = quote.request_payload?.packages || []
                        
                        return (
                          <tr key={quote.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              {new Date(quote.created_at).toLocaleString('ja-JP')}
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{request?.originCountry || '-'}</p>
                                <p className="text-sm text-gray-500">{request?.originCityName}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{request?.destinationCountry || '-'}</p>
                                <p className="text-sm text-gray-500">{request?.destinationCityName}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span>{packages.length}個</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant={getStatusBadgeVariant(quote.status)}>
                                {getStatusText(quote.status)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {response?.rates ? (
                                <span>{response.rates.length}件</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReuseQuote(quote)}
                                className="flex items-center gap-2"
                              >
                                <Repeat className="h-4 w-4" />
                                この内容で見積もり
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 