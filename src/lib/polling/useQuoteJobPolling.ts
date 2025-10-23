'use client'

import { useEffect, useRef, useState } from 'react'

type PollState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * 見積りジョブをポーリングして completed を検知する簡易hook。
 * - 最大待機: 30s（interval: 2.5s）
 * - completed で data を返し、timeout で明示エラー
 */
export function useQuoteJobPolling<T = any>(jobId: string | null | undefined, enabled = true) {
  const [state, setState] = useState<PollState<T>>({ data: null, loading: false, error: null })
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!jobId || !enabled) return
    let cancelled = false
    setState({ data: null, loading: true, error: null })

    const started = Date.now()
    const interval = 2500
    const max = 30000

    const run = async () => {
      try {
        const r = await fetch(`/api/quote/${jobId}`, { cache: 'no-store' })
        if (!r.ok) throw new Error(`QUOTE_STATUS_${r.status}`)
        const j = await r.json()
        if (cancelled) return
        if (j?.status === 'completed' && j?.data) {
          setState({ data: j.data as T, loading: false, error: null })
          return
        }
        if (Date.now() - started > max) {
          setState({ data: null, loading: false, error: '料金計算がタイムアウトしました。しばらくしてから再試行してください。' })
          return
        }
        timerRef.current = window.setTimeout(run, interval)
      } catch (e) {
        if (!cancelled) setState({ data: null, loading: false, error: (e as Error)?.message || 'QUOTE_POLL_ERROR' })
      }
    }
    run()

    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [jobId, enabled])

  return state
}


