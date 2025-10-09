import { createClient } from '@/lib/supabase/server'
import { getAppSettingBoolean } from '@/lib/settings/getAppSettingBoolean'

export type EffectiveAsset = { id: string; url: string; mime: string; source: 'admin' | 'user' } | null

export async function getEffectiveSignature(userId: string | null): Promise<EffectiveAsset> {
  const supabase = createClient()
  const forcePhoenix = await getAppSettingBoolean('FORCE_PHOENIX_SIGNATURE', false)
  const getPhoenix = async () => {
    const r: any = await (supabase as any)
      .from('admin_assets_signature')
      .select('id, storage_url, content_type')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const row = r?.data
    return row ? { id: row.id, url: row.storage_url, mime: row.content_type, source: 'admin' as const } : null
  }

  if (forcePhoenix) return await getPhoenix()
  if (userId) {
    const u: any = await (supabase as any)
      .from('user_signatures')
      .select('id, storage_url, content_type')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const row = u?.data
    if (row) return { id: row.id, url: row.storage_url, mime: row.content_type, source: 'user' }
  }
  return await getPhoenix()
}


