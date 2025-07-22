import { useState, useEffect, useCallback, useRef } from 'react'
import { signOut } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

interface UseIdleTimerOptions {
  idleTimeout?: number // アイドルタイムアウト時間（ミリ秒）
  warningTimeout?: number // 警告表示タイムアウト時間（ミリ秒）
  events?: string[] // 監視するイベント
  enabled?: boolean // タイマーの有効/無効
}

interface UseIdleTimerReturn {
  isWarningVisible: boolean
  remainingTime: number
  extendSession: () => void
  isIdle: boolean
}

const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000 // 30分
const DEFAULT_WARNING_TIMEOUT = 29 * 60 * 1000 // 29分
const DEFAULT_EVENTS = ['mousedown', 'mousemove', 'keypress', 'keydown', 'touchstart', 'scroll', 'wheel']

export const useIdleTimer = (options: UseIdleTimerOptions = {}): UseIdleTimerReturn => {
  const {
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    warningTimeout = DEFAULT_WARNING_TIMEOUT,
    events = DEFAULT_EVENTS,
    enabled = true
  } = options

  const { isAuthenticated } = useAuth()
  
  const [isWarningVisible, setIsWarningVisible] = useState(false)
  const [remainingTime, setRemainingTime] = useState(60) // 警告モーダル表示後の残り時間（秒）
  const [isIdle, setIsIdle] = useState(false)

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // セッション延長処理
  const extendSession = useCallback(() => {
    console.log('🔄 セッション延長: タイマーリセット')
    
    // 全てのタイマーをクリア
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }

    // 状態をリセット
    setIsWarningVisible(false)
    setIsIdle(false)
    setRemainingTime(60)
    lastActivityRef.current = Date.now()

    // タイマーを再スタート
    startTimers()
  }, [])

  // 強制ログアウト処理
  const performLogout = useCallback(async () => {
    console.log('🚪 自動ログアウト実行')
    setIsIdle(true)
    setIsWarningVisible(false)
    
    try {
      await signOut()
      console.log('✅ 自動ログアウト完了')
    } catch (error) {
      console.error('❌ 自動ログアウトエラー:', error)
    }
  }, [])

  // カウントダウンタイマー開始
  const startCountdown = useCallback(() => {
    setRemainingTime(60)
    
    countdownTimerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          // カウントダウン終了 → 強制ログアウト
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          performLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [performLogout])

  // 警告モーダル表示処理
  const showWarning = useCallback(() => {
    console.log('⚠️ セッション期限切れ警告表示')
    setIsWarningVisible(true)
    startCountdown()

    // 1分後に強制ログアウト
    logoutTimerRef.current = setTimeout(() => {
      performLogout()
    }, 60 * 1000)
  }, [startCountdown, performLogout])

  // タイマー開始
  const startTimers = useCallback(() => {
    if (!enabled || !isAuthenticated) return

    console.log('🎯 自動ログアウトタイマー開始:', {
      warningTime: `${warningTimeout / 60000}分`,
      logoutTime: `${idleTimeout / 60000}分`
    })

    // 警告表示タイマー（29分後）
    warningTimerRef.current = setTimeout(() => {
      showWarning()
    }, warningTimeout)

  }, [enabled, isAuthenticated, warningTimeout, showWarning])

  // ユーザーアクティビティハンドラー
  const handleActivity = useCallback(() => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current

    // 短時間での連続イベントを防ぐ（スロットリング）
    if (timeSinceLastActivity < 1000) return

    lastActivityRef.current = now

    // 警告表示中でない場合のみタイマーリセット
    if (!isWarningVisible) {
      extendSession()
    }
  }, [isWarningVisible, extendSession])

  // イベントリスナーの設定
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return
    }

    // イベントリスナーを追加
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // 初回タイマー開始
    startTimers()

    // クリーンアップ
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current)
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [enabled, isAuthenticated, events, handleActivity, startTimers])

  // 認証状態が変更された時の処理
  useEffect(() => {
    if (!isAuthenticated) {
      // ログアウト時は全てのタイマーをクリア
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current)
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      
      setIsWarningVisible(false)
      setIsIdle(false)
      setRemainingTime(60)
    }
  }, [isAuthenticated])

  return {
    isWarningVisible,
    remainingTime,
    extendSession,
    isIdle
  }
} 