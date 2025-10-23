import 'server-only'

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'

function getEnvLogLevel(): LogLevel {
  const v = (process.env.APP_LOG_LEVEL || 'info').toLowerCase()
  if (v === 'silent' || v === 'error' || v === 'warn' || v === 'info' || v === 'debug') return v
  return 'info'
}

function levelWeight(level: LogLevel): number {
  switch (level) {
    case 'silent': return 0
    case 'error': return 1
    case 'warn': return 2
    case 'info': return 3
    case 'debug': return 4
  }
}

function shouldLog(current: LogLevel, desired: Exclude<LogLevel, 'silent'>): boolean {
  return levelWeight(current) >= levelWeight(desired)
}

export type Logger = {
  info: (entry: Partial<LogEntry>) => void
  warn: (entry: Partial<LogEntry>) => void
  error: (entry: Partial<LogEntry> & { error?: unknown }) => void
  debug: (entry: Partial<LogEntry>) => void
  child: (extra: Partial<BaseFields>) => Logger
}

type BaseFields = {
  ns: string
  diagId?: string
}

export type LogEntry = BaseFields & {
  step?: string
  ok?: boolean
  duration_ms?: number
  context?: Record<string, unknown>
  error_code?: string | number
  error_message?: string
  upstream?: 'fedex' | 'db' | 'validation' | 'app' | string
}

function emit(level: Exclude<LogLevel, 'silent'>, entry: LogEntry & { ts?: string }) {
  const envLevel = getEnvLogLevel()
  if (!shouldLog(envLevel, level)) return

  // stack は debug のときのみ付与（呼び出し側が error_message などを設定）
  const ts = new Date().toISOString()
  const payload = { ts, level, ...entry }
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function createLogger(ns: string, diagId?: string): Logger {
  const base: BaseFields = { ns, diagId }
  return {
    info: (e) => emit('info', { ...base, ...(e as any) }),
    warn: (e) => emit('warn', { ...base, ...(e as any) }),
    error: (e) => emit('error', { ...base, ...(e as any) }),
    debug: (e) => emit('debug', { ...base, ...(e as any) }),
    child: (extra) => createLogger(extra.ns || base.ns, extra.diagId || base.diagId),
  }
}

export async function withTiming<T>(log: Logger, step: string, fn: () => Promise<T>, ctx?: Record<string, unknown>): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration_ms = Date.now() - start
    log.info({ step, ok: true, duration_ms, context: ctx })
    return result
  } catch (err: any) {
    const duration_ms = Date.now() - start
    const debugStack = process.env.APP_LOG_STACK_DEBUG === 'true'
    log.error({ step, ok: false, duration_ms, context: ctx, error_code: err?.code, error_message: err?.message, upstream: err?.upstream })
    if (debugStack && err?.stack) {
      log.debug({ step: `${step}.stack`, ok: false, context: { stack: String(err.stack).slice(0, 4000) } })
    }
    throw err
  }
}

export function mask(value?: string | null): string | undefined {
  if (value == null) return undefined
  if (value === '') return ''
  return '****'
}

export function maskZip(value?: string | null): string | undefined {
  if (value == null) return undefined
  const s = String(value)
  const head = s.replace(/[^0-9]/g, '').slice(0, 3)
  return head ? `${head}-****` : '****'
}

// PII マスキング（数字の長い連続列などを <redacted> に）
export function maskPII(input: any): any {
  try {
    return JSON.parse(JSON.stringify(input, (_k, v) => (typeof v === 'string' ? v.replace(/\b\d{10,16}\b/g, '<redacted>') : v)))
  } catch {
    return input
  }
}


