import 'server-only'

type JsonPrimitive = string | number | boolean | null
type Json = JsonPrimitive | Json[] | { [key: string]: Json }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function maskEmail(value: string): string {
  const at = value.indexOf('@')
  if (at <= 0) return '***'
  const domain = value.slice(at + 1)
  return `***@${domain}`
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return '*'.repeat(Math.max(0, digits.length))
  const keep = digits.slice(-4)
  let masked = ''
  let consumed = 0
  for (const ch of value) {
    if (/\d/.test(ch)) {
      const remaining = digits.length - consumed
      if (remaining > 4) {
        masked += '*'
      } else {
        masked += keep[keep.length - (4 - remaining)]
      }
      consumed += 1
    } else {
      masked += ch
    }
  }
  return masked
}

function shouldMaskByKey(key: string): 'name' | 'email' | 'phone' | 'street' | null {
  const k = key.toLowerCase()
  if (/^(first|last|given|family)?_?name$/.test(k) || /(contact|recipient|shipper).*name/.test(k)) {
    return 'name'
  }
  if (/^(email|e[-_]?mail)/.test(k)) {
    return 'email'
  }
  if (/^(phone|tel|telephone)/.test(k)) {
    return 'phone'
  }
  if (/^(street|address(_?line)?\d*|line\d+)$/.test(k)) {
    return 'street'
  }
  return null
}

function maskValueByKey(key: string, value: unknown): unknown {
  const kind = shouldMaskByKey(key)
  if (!kind) return value
  if (typeof value !== 'string') return '***'
  switch (kind) {
    case 'email':
      return maskEmail(value)
    case 'phone':
      return maskPhone(value)
    case 'name':
      return 'REDACTED_NAME'
    case 'street':
      return 'REDACTED_ADDRESS'
    default:
      return '***'
  }
}

export function maskPII<T>(input: T): T {
  function walk(node: unknown, parentKey?: string): unknown {
    if (Array.isArray(node)) {
      return node.map((item) => walk(item))
    }
    if (isPlainObject(node)) {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node)) {
        // zip/country/service は保持
        if (/^(postal|zip)_?code$/.test(k.toLowerCase()) || k.toLowerCase() === 'country' || k.toLowerCase() === 'service_type' || k.toLowerCase() === 'service') {
          out[k] = walk(v, k)
          continue
        }
        const masked = maskValueByKey(k, v)
        if (masked !== v) {
          out[k] = masked
        } else {
          out[k] = walk(v, k)
        }
      }
      return out as T
    }
    if (typeof node === 'string') {
      // ヒューリスティック: 生の文字列にメール/電話が含まれる場合の軽いマスク
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(node)) return maskEmail(node)
      if (/[0-9][\s\-()]{0,2}[0-9]{2,}/.test(node)) return maskPhone(node)
      return node
    }
    return node
  }

  return walk(input) as T
}

type LogLevel = 'info' | 'warn' | 'error'

function emit(level: LogLevel, event: string, data?: unknown): void {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    data: data !== undefined ? maskPII(data) : undefined,
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
