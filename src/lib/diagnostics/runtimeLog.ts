type LogLevel = 'info' | 'error'

export type StructuredLog = {
  level: LogLevel
  jobId: string
  step: string
  status: 'OK' | 'ERROR'
  cause?: string | null
  latencyMs?: number
  attempt?: number
  ts?: string
}

function stringifySafe(obj: unknown): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return JSON.stringify({ level: 'error', step: 'logStringify', status: 'ERROR', cause: 'JSON_STRINGIFY_FAILED' })
  }
}

function print(line: string) {
  // 256KB以内に収める（念のため切り詰め）
  const MAX = 256 * 1024
  if (line.length > MAX) {
    line = line.slice(0, MAX - 20) + '"...truncated"}'
  }
  console.log(line)
}

export function logInfo(payload: StructuredLog) {
  const obj: StructuredLog = {
    level: 'info',
    ts: payload.ts ?? new Date().toISOString(),
    jobId: payload.jobId,
    step: payload.step,
    status: payload.status,
    cause: payload.cause ?? null,
    latencyMs: payload.latencyMs,
    attempt: payload.attempt,
  }
  print(stringifySafe(obj))
}

export function logError(payload: StructuredLog) {
  const obj: StructuredLog = {
    level: 'error',
    ts: payload.ts ?? new Date().toISOString(),
    jobId: payload.jobId,
    step: payload.step,
    status: payload.status,
    cause: payload.cause ?? null,
    latencyMs: payload.latencyMs,
    attempt: payload.attempt,
  }
  print(stringifySafe(obj))
}


