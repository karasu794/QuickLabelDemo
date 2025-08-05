'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { adminCancelShipmentAction } from '@/app/actions/adminActions'

interface AdminCancelShipmentButtonProps {
  trackingNumber: string
  currentStatus: string
  disabled?: boolean
  onSuccess?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface CancelResult {
  type: 'success' | 'error'
  message: string
}

export default function AdminCancelShipmentButton({
  trackingNumber,
  currentStatus,
  disabled = false,
  onSuccess,
  className = '',
  size = 'sm'
}: AdminCancelShipmentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CancelResult | null>(null)

  // キャンセル不可能なステータスをチェック
  const isCancellable = currentStatus !== 'CANCELED' && 
                       currentStatus !== 'CANCELLED' && 
                       currentStatus !== 'delivered' && 
                       currentStatus !== 'cancelled'

  const handleCancel = async () => {
    // 確認ダイアログ
    const confirmCancel = window.confirm(
      `【管理者権限】追跡番号 ${trackingNumber} の発送をキャンセルし、返金処理を行いますか？\n\nこの操作は取り消すことができません。`
    )

    if (!confirmCancel) {
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      console.log('🚫 管理者による発送キャンセル・返金処理開始:', trackingNumber)
      
      // Admin Server Actionを呼び出し
      const response = await adminCancelShipmentAction(trackingNumber)
      
      if (response.success) {
        console.log('✅ 管理者キャンセル・返金成功:', response.message)
        setResult({
          type: 'success',
          message: response.message
        })
        
        // 成功時のコールバック
        if (onSuccess) {
          onSuccess()
        }
        
        // 2秒後にページをリロードして最新状態を反映
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        
      } else {
        console.error('❌ 管理者キャンセル・返金失敗:', response.message)
        setResult({
          type: 'error',
          message: response.message
        })
      }
      
    } catch (error) {
      console.error('❌ 管理者キャンセル・返金処理エラー:', error)
      setResult({
        type: 'error',
        message: '管理者キャンセル・返金処理中にエラーが発生しました'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // キャンセル不可能な場合は何も表示しない
  if (!isCancellable || disabled) {
    return null
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCancel}
        disabled={isLoading}
        variant="outline"
        size={size}
        className={`min-w-[100px] bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            キャンセル中...
          </>
        ) : (
          <>
            <X className="h-4 w-4 mr-2" />
            管理者キャンセル
          </>
        )}
      </Button>

      {/* 結果メッセージ */}
      {result && (
        <div
          className={`text-sm p-2 rounded border ${
            result.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}