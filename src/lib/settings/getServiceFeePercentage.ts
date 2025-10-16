import { createServiceRoleClient } from '@/lib/supabase/server'

const DEFAULT_SERVICE_FEE_PERCENTAGE = Number(process.env.DEFAULT_SERVICE_FEE_PERCENTAGE ?? 10)
const CACHE_TTL_OK_MS = 5 * 60 * 1000
const CACHE_TTL_ERR_MS = 30 * 1000

type CacheEntry = { value: number; expiresAt: number }
let cache: CacheEntry | null = null

function clampPercent(pct: number): number {
  if (!isFinite(pct)) return DEFAULT_SERVICE_FEE_PERCENTAGE
  return Math.min(Math.max(pct, 0), 50)
}

export async function getServiceFeePercentage(opts?: { bypassCache?: boolean }): Promise<number> {
  const now = Date.now()
  if (!opts?.bypassCache && cache && cache.expiresAt > now) {
    return cache.value
  }

  const supabase = createServiceRoleClient()
  try {
    const { data, error } = await supabase
      .from('app_settings' as any)
      .select('value, service_fee_percentage')
      .eq('key', 'service_fee_percentage')
      .limit(1)
      .maybeSingle()

    if (error) throw error

    let pct: number | null = null
    // valueは文字列想定
    const strVal = (data as any)?.value as string | null | undefined
    if (typeof strVal === 'string' && strVal.trim() !== '') {
      const parsed = parseFloat(strVal)
      if (!Number.isNaN(parsed)) pct = parsed
    }

    if (pct === null || Number.isNaN(pct)) {
      const numericCol = (data as any)?.service_fee_percentage
      if (typeof numericCol === 'number') pct = numericCol
    }

    if (pct === null || Number.isNaN(pct)) pct = DEFAULT_SERVICE_FEE_PERCENTAGE

    const clamped = clampPercent(pct)
    cache = { value: clamped, expiresAt: now + CACHE_TTL_OK_MS }
    return clamped
  } catch (e) {
    const fallback = DEFAULT_SERVICE_FEE_PERCENTAGE
    cache = { value: fallback, expiresAt: now + CACHE_TTL_ERR_MS }
    return fallback
  }
}


