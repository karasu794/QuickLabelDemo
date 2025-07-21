'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMPSStore } from '@/store/mpsStore'
import { SquarePaymentForm } from '@/components/SquarePaymentForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Package, CreditCard, FileText, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface ConfirmationResult {
  masterTrackingNumber: string
  status: 'confirmed' | 'processing'
  packageResponses?: Array<{
    trackingNumber: string
    sequenceNumber: number
    packageDocuments?: Array<{
      url?: string
      contentType: string
    }>
  }>
  labelUrls?: string[]
  jobId?: string
  paymentId?: string
}

export default function MPSConfirmPage() {
  const router = useRouter()
  const {
    shipment,
    shipperInfo,
    recipientInfo,
    packages,
    items,
    payment,
    isLoading,
    error,
    setPayment,
    updateShipmentStatus,
    setCurrentStep,
    setLoading,
    setError
  } = useMPSStore()

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [serviceFee, setServiceFee] = useState(10) // デフォルト10%
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [finalCharge, setFinalCharge] = useState(0)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    setCurrentStep('confirm')
    
    // Open Shipmentが作成されていない場合は前のステップに戻る
    if (!shipment || !shipment.masterTrackingNumber) {
      router.push('/shipping/mps/setup')
      return
    }

    // すべてのパッケージが追加されているかチェック
    const hasUnaddedPackages = packages.some(pkg => !pkg.addedToFedEx)
    if (hasUnaddedPackages) {
      router.push('/shipping/mps/add-packages')
      return
    }

    // 料金を取得
    fetchServiceFee()
    estimateShippingCost()
  }, [setCurrentStep, shipment, packages, router])

  // サービス料金を取得
  const fetchServiceFee = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const settings = await response.json()
        const feePercentage = settings.find((s: any) => s.key === 'service_fee_percentage')
        if (feePercentage) {
          setServiceFee(parseFloat(feePercentage.value))
        }
      }
    } catch (error) {
      console.warn('サービス料金の取得に失敗しました。デフォルト値を使用します。', error)
    }
  }

  // 配送料金を見積もり
  const estimateShippingCost = () => {
    // 簡易見積もり（実際にはRate APIを使用することも可能）
    const totalWeight = packages.reduce((sum, pkg) => sum + (parseFloat(pkg.weight) || 0), 0)
    const baseRate = totalWeight * 3000 // kg当たり3000円の仮レート
    const estimatedAmount = Math.round(baseRate)
    
    setEstimatedCost(estimatedAmount)
    setFinalCharge(Math.round(estimatedAmount * (1 + serviceFee / 100)))
  }

  // 決済成功後の確定処理
  const handlePaymentSuccess = async (sourceId: string) => {
    setIsConfirming(true)
    setError(null)

    try {
      // 決済情報をストアに保存
      setPayment({ sourceId, finalCharge })

      console.log('🚀 Open Shipment確定処理開始...')

      const requestData = {
        masterTrackingNumber: shipment?.masterTrackingNumber,
        labelResponseOptions: 'URL_ONLY',
        paymentInfo: {
          sourceId,
          finalCharge
        }
      }

      const response = await fetch('/api/open-ship/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Open Shipment確定に失敗しました')
      }

      const result = await response.json()
      console.log('✅ Open Shipment確定成功:', result.data)

      setConfirmationResult(result.data)
      updateShipmentStatus(result.data.status)

      // 決済IDを保存
      if (result.data.paymentId) {
        setPayment({ sourceId, finalCharge, paymentId: result.data.paymentId })
      }

    } catch (error) {
      console.error('❌ Open Shipment確定エラー:', error)
      setError(error instanceof Error ? error.message : 'Open Shipment確定に失敗しました')
    } finally {
      setIsConfirming(false)
    }
  }

  // ラベルダウンロード
  const downloadLabels = async () => {
    if (!confirmationResult?.labelUrls?.length) {
      alert('ダウンロード可能なラベルがありません')
      return
    }

    try {
      // 複数のラベルを順次ダウンロード
      for (const [index, url] of confirmationResult.labelUrls.entries()) {
        const response = await fetch('/api/download-label', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ labelUrl: url }),
        })

        if (response.ok) {
          const blob = await response.blob()
          const downloadUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = `mps-label-${confirmationResult.masterTrackingNumber}-pkg${index + 1}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(downloadUrl)
          document.body.removeChild(a)
        }
      }
    } catch (error) {
      console.error('ラベルダウンロードエラー:', error)
      alert('ラベルのダウンロードに失敗しました')
    }
  }

  // 非同期処理結果のポーリング（40個超の場合）
  const pollAsyncResults = async (jobId: string) => {
    const maxAttempts = 30 // 最大5分間（10秒×30回）
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/open-ship/confirm?jobId=${jobId}&accountNumber=${process.env.NEXT_PUBLIC_FEDEX_ACCOUNT_NUMBER}`)
        
        if (response.ok) {
          const result = await response.json()
          if (result.data.status === 'confirmed') {
            setConfirmationResult(result.data)
            updateShipmentStatus('confirmed')
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000) // 10秒後に再試行
        } else {
          setError('処理に時間がかかっています。しばらく後に確認してください。')
        }
      } catch (error) {
        console.error('非同期処理結果取得エラー:', error)
        setError('処理結果の取得に失敗しました')
      }
    }

    poll()
  }

  const totalPackages = packages.length
  const totalWeight = packages.reduce((sum, pkg) => sum + (parseFloat(pkg.weight) || 0), 0)
  const isInternational = shipperInfo.countryCode !== recipientInfo.countryCode

  return (
    <div className="space-y-6">
      {/* Open Shipment情報 */}
      {shipment && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Open Shipment確定</h3>
                <p className="text-blue-700 text-sm">追跡番号: {shipment.masterTrackingNumber}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {totalPackages}個のパッケージ
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!confirmationResult ? (
        <>
          {/* 配送情報確認 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                配送情報確認
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 荷送人 */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">荷送人</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>{shipperInfo.companyName}</p>
                    <p>{shipperInfo.contactName}</p>
                    <p>{shipperInfo.phoneNumber}</p>
                    <p>{shipperInfo.address1}</p>
                    <p>{shipperInfo.cityName}, {shipperInfo.postalCode}</p>
                    <p>{shipperInfo.countryCode}</p>
                  </div>
                </div>
                
                {/* 荷受人 */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">荷受人</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>{recipientInfo.companyName}</p>
                    <p>{recipientInfo.contactName}</p>
                    <p>{recipientInfo.phoneNumber}</p>
                    <p>{recipientInfo.email}</p>
                    <p>{recipientInfo.address1}</p>
                    <p>{recipientInfo.cityName}, {recipientInfo.postalCode}</p>
                    <p>{recipientInfo.countryCode} {recipientInfo.isResidential && '(個人宅)'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* パッケージ概要 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">パッケージ概要</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold">{totalPackages}</div>
                    <div className="text-sm text-gray-600">総パッケージ数</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold">{totalWeight.toFixed(1)} kg</div>
                    <div className="text-sm text-gray-600">総重量</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold">{isInternational ? '国際' : '国内'}</div>
                    <div className="text-sm text-gray-600">配送タイプ</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 料金確認と決済 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                料金と決済
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 料金内訳 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>配送料金（見積もり）</span>
                  <span>¥{estimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>サービス手数料 ({serviceFee}%)</span>
                  <span>¥{(finalCharge - estimatedCost).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>合計</span>
                  <span>¥{finalCharge.toLocaleString()}</span>
                </div>
              </div>

              {/* Square決済フォーム */}
              <div className="mt-6">
                <SquarePaymentForm
                  amount={finalCharge}
                  onPaymentSuccess={handlePaymentSuccess}
                  disabled={isConfirming}
                />
              </div>

              {isConfirming && (
                <div className="flex items-center justify-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                  <span className="text-yellow-800">Open Shipment確定処理中...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* 確定完了画面 */
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Open Shipment確定完了
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                送り状作成完了！
              </h3>
              <p className="text-green-700 mb-4">
                マスター追跡番号: <span className="font-mono font-bold">{confirmationResult.masterTrackingNumber}</span>
              </p>
            </div>

            {confirmationResult.status === 'processing' ? (
              /* 非同期処理中 */
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h4 className="font-semibold text-yellow-800">大量パッケージ処理中</h4>
                <p className="text-yellow-700 text-sm">
                  40個を超えるパッケージのため非同期処理中です。<br />
                  ラベル生成完了まで数分お待ちください。
                </p>
                {confirmationResult.jobId && (
                  <Button
                    onClick={() => pollAsyncResults(confirmationResult.jobId!)}
                    className="mt-2"
                    size="sm"
                  >
                    処理状況を確認
                  </Button>
                )}
              </div>
            ) : (
              /* ラベル生成完了 */
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">生成されたラベル</h4>
                <div className="space-y-2">
                  {confirmationResult.packageResponses?.map((pkg, index) => (
                    <div key={pkg.trackingNumber} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <span className="font-medium">パッケージ {pkg.sequenceNumber}</span>
                        <span className="text-sm text-gray-600 ml-2">追跡番号: {pkg.trackingNumber}</span>
                      </div>
                      {pkg.packageDocuments?.[0]?.url && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          ラベル準備完了
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {confirmationResult.labelUrls && confirmationResult.labelUrls.length > 0 && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={downloadLabels}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      すべてのラベルをダウンロード
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 決済情報 */}
            {confirmationResult.paymentId && (
              <div className="mt-4 p-3 bg-white border rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">決済情報</h4>
                <div className="text-sm text-gray-700">
                  <p>決済ID: {confirmationResult.paymentId}</p>
                  <p>支払金額: ¥{finalCharge.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={() => router.push('/mypage/history')}
                variant="outline"
              >
                配送履歴を確認
              </Button>
              <Button
                onClick={() => {
                  // 新しいMPSフローを開始
                  window.location.href = '/shipping/mps/setup'
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                新しいMPS配送を作成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 戻るボタン（確定前のみ） */}
      {!confirmationResult && (
        <div className="flex justify-start">
          <Button
            onClick={() => router.push('/shipping/mps/add-packages')}
            variant="outline"
            disabled={isConfirming}
          >
            前に戻る
          </Button>
        </div>
      )}
    </div>
  )
} 