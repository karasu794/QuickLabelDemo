// --- Hookdeck Publish (安全な薄いラッパー) ---
const PUBLISH_URL = process.env.HOOKDECK_PUBLISH_URL || 'https://hkdk.events/v1/publish'
const SOURCE_NAME = process.env.HOOKDECK_SOURCE_NAME || 'fql-prod'
const API_KEY = process.env.HOOKDECK_API_KEY

export type HookdeckEvent = {
  type: string // e.g. 'payment.error' | 'ship.error' | 'label.error' | 'label.download' | 'success.gate'
  env?: 'prod' | 'staging' | 'dev'
  detail?: Record<string, any>
  diagId?: string
}

function redact(o: any) {
  try {
    const s = JSON.stringify(o, (k, v) => {
      if (typeof v === 'string' && /secret|token|card|auth|password/i.test(k)) return '[REDACTED]'
      return v
    })
    return JSON.parse(s)
  } catch {
    return {}
  }
}

export async function publishHookdeck(e: HookdeckEvent) {
  if (!API_KEY) return { ok: false, skipped: 'no_api_key' } as const
  try {
    const res = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'X-Hookdeck-Source-Name': SOURCE_NAME,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: e.type,
        env: e.env || (process.env.VERCEL_ENV === 'production' ? 'prod' : 'staging'),
        detail: redact(e.detail || {}),
        diagId: e.diagId,
      }),
    })
    return { ok: res.ok, status: res.status } as const
  } catch (err) {
    return { ok: false, error: String(err) } as const
  }
}


