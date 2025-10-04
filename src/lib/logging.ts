import 'server-only'

// SR-D: maskPII 撤去。最小差分のため no-op sanitize を残す
export function sanitize<T>(input: T): T {
  return input
}

type LogLevel = 'info' | 'warn' | 'error'

function emit(level: LogLevel, event: string, data?: unknown): void {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    // SR-D: 生ログを出力。必要なら sanitize(data) を介す
    data: data !== undefined ? data : undefined,
  }
  const line = JSON.stringify(entry)
  if (level === 'info') console.log(line)
  else if (level === 'warn') console.warn(line)
  else console.error(line)
}

export function logInfo(event: string, data?: unknown): void {
  emit('info', event, data)
}

export function logWarn(event: string, data?: unknown): void {
  emit('warn', event, data)
}

export function logError(event: string, data?: unknown): void {
  emit('error', event, data)
}

// Legacy log(ctx, data) API is removed to avoid duplicate symbol names.
