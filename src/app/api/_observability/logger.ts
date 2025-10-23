import { randomUUID } from 'crypto'
import { maskPII } from '@/lib/observability/logger'

type Level = 'info' | 'warn' | 'error'

function base(level: Level, ns: string, reqId: string, payload: Record<string, unknown>) {
  const body = { level, ns, reqId, ts: new Date().toISOString(), ...payload }
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(JSON.stringify(body))
  else if (level === 'warn') console.warn(JSON.stringify(body))
  else console.log(JSON.stringify(body))
}

export function createApiLogger(ns: string, providedReqId?: string) {
  const reqId = providedReqId || randomUUID()
  return {
    info(payload: Record<string, unknown>) { base('info', ns, reqId, maskPII(payload)) },
    warn(payload: Record<string, unknown>) { base('warn', ns, reqId, maskPII(payload)) },
    error(payload: Record<string, unknown>) { base('error', ns, reqId, maskPII(payload)) },
    reqId,
  }
}

export const logStep = (name: string, payload: any = {}) => {
  const safe = maskPII(payload)
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ step: name, ...safe }))
}


