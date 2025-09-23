import 'server-only'

export type MaskOptions = { keepTail?: number }

function maskValue(v: unknown, keepTail: number): unknown {
  if (v == null) return v
  const s = String(v)
  if (s.length <= keepTail) return '*'.repeat(Math.max(0, s.length - 1)) + s.slice(-1)
  const tail = s.slice(-keepTail)
  return '*'.repeat(Math.max(0, s.length - keepTail)) + tail
}

export function maskPII<T>(payload: T, opts: MaskOptions = { keepTail: 4 }): T {
  const keepTail = opts.keepTail ?? 4
  try {
    if (payload && typeof payload === 'object') {
      const cloned: any = Array.isArray(payload) ? [...(payload as any)] : { ...(payload as any) }
      const keysToMask = ['name', 'contactName', 'phone', 'phoneNumber', 'address1', 'address2', 'email']
      for (const k of keysToMask) {
        if (k in cloned && typeof cloned[k] === 'string') {
          cloned[k] = maskValue(cloned[k], keepTail)
        }
      }
      return cloned
    }
    return payload
  } catch {
    return payload
  }
}

export type LogContext = {
  correlationId: string
  event: string
  level?: 'info' | 'warn' | 'error'
} & Record<string, unknown>

export function log(ctx: LogContext, data?: unknown): void {
  const { level = 'info', ...rest } = ctx
  const base = { ts: new Date().toISOString(), ...rest }
  try {
    const masked = data ? maskPII(data) : undefined
    const line = JSON.stringify({ ...base, data: masked })
    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.info(line)
    }
  } catch (e) {
    console.info({ ...base, data: '[unserializable]' })
  }
}
