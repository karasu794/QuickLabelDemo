'use client'

import { useIdleTimer } from '@/hooks/useIdleTimer'
import IdleTimeoutModal from './IdleTimeoutModal'
import { useAuth } from '@/hooks/useAuth'

interface IdleTimeoutProviderProps {
  children: React.ReactNode
  idleTimeout?: number // カスタムタイムアウト時間（ミリ秒）
  warningTimeout?: number // カスタム警告時間（ミリ秒）
  enabled?: boolean // 機能の有効/無効
}

export default function IdleTimeoutProvider({
  children,
  idleTimeout,
  warningTimeout,
  enabled = true
}: IdleTimeoutProviderProps) {
  const { isAuthenticated } = useAuth()
  
  const {
    isWarningVisible,
    remainingTime,
    extendSession,
    isIdle
  } = useIdleTimer({
    idleTimeout,
    warningTimeout,
    enabled: enabled && isAuthenticated // 認証済みの場合のみ有効
  })

  return (
    <>
      {children}
      
      {/* 自動ログアウト警告モーダル */}
      <IdleTimeoutModal
        isVisible={isWarningVisible}
        remainingTime={remainingTime}
        onExtendSession={extendSession}
      />
      
      {/* デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && isAuthenticated && (
        <div className="fixed bottom-4 right-4 bg-blue-900 text-white text-xs p-2 rounded shadow-lg z-40">
          <div>自動ログアウト: {enabled ? '有効' : '無効'}</div>
          <div>警告表示: {isWarningVisible ? 'あり' : 'なし'}</div>
          <div>アイドル状態: {isIdle ? 'はい' : 'いいえ'}</div>
          {isWarningVisible && (
            <div>残り時間: {remainingTime}秒</div>
          )}
        </div>
      )}
    </>
  )
} 