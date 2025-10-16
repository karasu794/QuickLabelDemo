import { createServiceRoleClient } from '@/lib/supabase/server'

const DEFAULT_TERMS_VERSION = 'v1'
const CACHE_TTL_OK_MS = 5 * 60 * 1000
const CACHE_TTL_ERR_MS = 30 * 1000

type CacheEntry = { value: string; expiresAt: number }
let cache: CacheEntry | null = null

export async function getCurrentTermsVersion(opts?: { bypassCache?: boolean }): Promise<string> {
  const now = Date.now()
  if (!opts?.bypassCache && cache && cache.expiresAt > now) {
    return cache.value
  }

  const supabase = createServiceRoleClient()
  try {
    const { data, error } = await supabase
      .from('app_settings' as any)
      .select('value')
      .eq('key', 'current_terms_version')
      .limit(1)
      .maybeSingle()

    if (error) throw error
    const v = (data as any)?.value
    const ver = typeof v === 'string' && v.trim() !== '' ? v.trim() : DEFAULT_TERMS_VERSION
    cache = { value: ver, expiresAt: now + CACHE_TTL_OK_MS }
    return ver
  } catch {
    cache = { value: DEFAULT_TERMS_VERSION, expiresAt: now + CACHE_TTL_ERR_MS }
    return DEFAULT_TERMS_VERSION
  }
}


