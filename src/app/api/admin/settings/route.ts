import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppSettingBoolean } from '@/lib/settings/getAppSettingBoolean'
// local minimal admin check to avoid SSR coupling in tests

const KEYS = ['FORCE_PHOENIX_LETTERHEAD', 'FORCE_PHOENIX_SIGNATURE'] as const
type SettingKey = typeof KEYS[number]
type SettingRow = { key: string; value: { enabled?: boolean } }

// Row type for app_settings
type AppSettingRow = {
  key: string
  value: { enabled: boolean }
}

async function isAdminServer(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase.from('profiles').select('role,is_admin').eq('id', user.id).maybeSingle()
    const p: any = profile || {}
    return !!(p.is_admin === true || String(p.role || '').toLowerCase() === 'admin')
  } catch {
    return false
  }
}

function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(s)) return true
    if (['0', 'false', 'no', 'off'].includes(s)) return false
  }
  return undefined
}

export async function GET() {
  if (!(await isAdminServer())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const supabase = createClient()
  const { data, error } = await supabase.from('app_settings').select('key,value')
  if (error) {
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  }

  const result: Record<SettingKey, boolean> = {
    FORCE_PHOENIX_LETTERHEAD: await getAppSettingBoolean('FORCE_PHOENIX_LETTERHEAD', false),
    FORCE_PHOENIX_SIGNATURE: await getAppSettingBoolean('FORCE_PHOENIX_SIGNATURE', false),
  }
  ;(data ?? []).forEach((row: SettingRow) => {
    if (KEYS.includes(row.key as SettingKey)) {
      const on = typeof row.value?.enabled === 'boolean' ? row.value.enabled : undefined
      if (typeof on === 'boolean') result[row.key as SettingKey] = on
    }
  })

  const res = NextResponse.json({ settings: result }, { status: 200 })
  const headersAny: any = (res as any).headers
  if (headersAny) {
    if (typeof headersAny.set === 'function') {
      headersAny.set('Cache-Control', 'private, max-age=60')
    } else if (typeof headersAny === 'object') {
      headersAny['Cache-Control'] = 'private, max-age=60'
    }
  }
  return res
}

export async function POST(req: Request) {
  if (!(await isAdminServer())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const upserts: AppSettingRow[] = []
  for (const k of KEYS) {
    if (k in body) {
      const b = coerceBool((body as any)[k])
      if (typeof b !== 'boolean') {
        return NextResponse.json({ error: 'bad_request', code: 'INVALID_TYPE', field: k }, { status: 400 })
      }
      upserts.push({ key: k, value: { enabled: b } })
    }
  }
  if (upserts.length === 0) {
    return NextResponse.json({ error: 'bad_request', code: 'NO_FIELDS' }, { status: 400 })
  }
  const supabase = createClient()
  const { error } = await (supabase as any)
    .from('app_settings')
    .upsert(upserts, { onConflict: 'key' } as any)
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 200 })
}


