'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { adminCancelShipmentAction } from '@/app/actions/adminActions'
// 避難: 依存追加なしで簡易ミューテーションを内製

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

  const [isMutating, setIsMutating] = useState(false)
  const trigger = async (arg: string) => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/ship/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: arg })
      })
      return res
    } finally {
      setIsMutating(false)
    }
  }

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
      const res = await trigger(trackingNumber)
      if ([200, 204, 207].includes(res.status)) {
        setResult({ type: 'success', message: '出荷をキャンセルしました。' })
        if (onSuccess) onSuccess()
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setResult({ type: 'error', message: `キャンセルに失敗しました（${res.status}）` })
      }
    } catch (e) {
      setResult({ type: 'error', message: 'キャンセル処理中にエラーが発生しました' })
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
        disabled={isLoading || isMutating}
        variant="outline"
        size={size}
        className={`min-w-[100px] bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 ${className}`}
        data-test="admin-cancel"
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