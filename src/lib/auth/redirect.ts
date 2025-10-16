// 安全なリダイレクト判定とコールバックURL生成ユーティリティ
import { siteUrl } from '@/lib/config'

// アプリ内パスの安全判定: "/" から始まり、プロトコル指定(://)や二重スラッシュ(//)を含まない
export function isSafePath(raw: string | null | undefined): boolean {
  if (!raw) return false
  if (typeof raw !== 'string') return false
  if (!raw.startsWith('/')) return false
  if (raw.startsWith('//')) return false
  if (raw.includes('://')) return false
  return true
}

// コールバックURLを構築し、必要に応じて next を付与
export function buildAuthCallbackUrl(nextPath?: string | null, type?: string): string {
  const base = String(siteUrl || '').replace(/\/$/, '')
  const url = new URL(base + '/auth/callback')
  if (type) url.searchParams.set('type', type)
  if (nextPath && isSafePath(nextPath)) {
    url.searchParams.set('next', nextPath)
  }
  return url.toString()
}

// 生の next 値から安全なパスを解決（不正時はフォールバック）
export function resolveSafeNext(raw: string | null | undefined, fallback: string = '/mypage'): string {
  if (isSafePath(raw)) return String(raw)
  return fallback
}


