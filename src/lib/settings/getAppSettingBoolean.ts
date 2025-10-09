import { createClient } from '@/lib/supabase/server'

export async function getAppSettingBoolean(key: string, envDefault: boolean): Promise<boolean> {
  const supabase = createClient()
  try {
    const q = supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .limit(1)
    const { data } = await (q as any).maybeSingle?.() ?? {}
    if (data?.value && typeof (data as any).value?.enabled === 'boolean') return !!(data as any).value.enabled
  } catch {}
  const envVal = process.env[key]
  if (typeof envVal === 'string') return ['1', 'true', 'yes', 'on'].includes(envVal.toLowerCase())
  return envDefault
}


