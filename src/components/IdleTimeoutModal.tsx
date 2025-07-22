'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface IdleTimeoutModalProps {
  isVisible: boolean
  remainingTime: number
  onExtendSession: () => void
}

export default function IdleTimeoutModal({
  isVisible,
  remainingTime,
  onExtendSession
}: IdleTimeoutModalProps) {
  if (!isVisible) return null

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        {/* モーダルコンテンツ */}
        <Card className="max-w-md w-full mx-4 p-6 bg-white shadow-xl">
          <div className="text-center space-y-4">
            {/* アイコン */}
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-orange-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>

            {/* タイトル */}
            <h2 className="text-xl font-bold text-gray-900">
              セッション期限切れ警告
            </h2>

            {/* メッセージ */}
            <div className="space-y-2">
              <p className="text-gray-600">
                長時間操作が行われていないため、セキュリティのためまもなく自動的にログアウトされます。
              </p>
              <p className="text-sm text-gray-500">
                作業を継続される場合は、「セッションを延長する」ボタンをクリックしてください。
              </p>
            </div>

            {/* カウントダウン表示 */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 mb-1">
                自動ログアウトまで
              </div>
              <div className="text-2xl font-mono font-bold text-red-700">
                {formatTime(remainingTime)}
              </div>
            </div>

            {/* ボタン */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={onExtendSession}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                セッションを延長する
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
                onClick={() => {
                  // 何もしない（自動ログアウトを待つ）
                }}
              >
                ログアウトする
              </Button>
            </div>

            {/* 注意事項 */}
            <div className="text-xs text-gray-400 border-t pt-3">
              <p>
                操作なしで {formatTime(remainingTime)} 経過すると、
                自動的にログアウトされます。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
} 