import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger, type Logger } from '@/lib/observability/logger'

// Minimal ULID implementation (no external deps)
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
function encodeTime(time: number, len: number): string {
  let str = ''
  for (let i = len - 1; i >= 0; i--) {
    const mod = time % 32
    str = CROCKFORD[mod] + str
    time = (time - mod) / 32
  }
  return str
}
function encodeRandom(len: number): string {
  let str = ''
  for (let i = 0; i < len; i++) {
    str += CROCKFORD[Math.floor(Math.random() * 32)]
  }
  return str
}
export function ulid(): string {
  const time = Date.now()
  return encodeTime(time, 10) + encodeRandom(16)
}

export type TraceContext = {
  requestId: string
  log: Logger
  isMock: boolean
  headers: Headers
}

// 追加: 本番での mock 無効化を明示
export function isMockEnabled(req: Request): boolean {
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) return false
  const cookie = req.headers.get('cookie') || ''
  const byCookie = /(?:^|;\s*)core-mode=mock\b/.test(cookie)
  const byEnv = process.env.CORE_MODE === 'mock'
  return byCookie || Boolean(byEnv)
}

/**
 * Wrap API handlers with trace context: generate/request-propagate requestId,
 * add x-request-id to response, and log start/end/error.
 */
export async function withTrace(
  ns: string,
  req: NextRequest,
  fn: (ctx: TraceContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const incoming = req.headers.get('x-request-id') || req.headers.get('X-Request-Id')
  const requestId = incoming || ulid()
  const log = createLogger(ns, requestId)
  const start = Date.now()
  log.info({ step: 'start', ok: true })
  try {
    const headers = new Headers()
    headers.set('x-request-id', requestId)
    const res = await fn({ requestId, log, isMock: isMockEnabled(req), headers })
    if (!res.headers.has('x-request-id')) res.headers.set('x-request-id', requestId)
    log.info({ step: 'end', ok: true, duration_ms: Date.now() - start })
    return res
  } catch (e: any) {
    log.error({ step: 'error', ok: false, error_message: String(e?.message || e) })
    const res = NextResponse.json({ ok: false, error: 'Internal Server Error', requestId }, { status: 500 })
    res.headers.set('x-request-id', requestId)
    return res
  }
}


