import 'server-only'
import { logInfo, logWarn } from '@/lib/logging'

export type RateConsistencyInput = {
  orderId: string
  shipTotal: number
  currency: string
}

function envBool(name: string, def = false): boolean {
  const v = process.env[name]
  if (v == null) return def
  return ['1','true','yes','on'].includes(String(v).toLowerCase())
}

function envNum(name: string, def: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) ? v : def
}

export async function fetchReferenceTotal(orderId: string): Promise<{ total: number; currency: string } | null> {
  // A) TODO: 直近Quote（送料小計）をDBから取得（存在すれば優先）
  // B) 代替として Square 決済金額（同通貨のみ）を参照
  // 最小差分のため、ここでは未実装→null返却。後続で WARN スキップ。
  return null
}

export async function assertRateConsistency(input: RateConsistencyInput): Promise<void> {
  if (!envBool('REQUIRE_RATE_MATCH', false)) return
  const ref = await fetchReferenceTotal(input.orderId)
  if (!ref) {
    logWarn('rate_guard_skipped', { orderId: input.orderId, reason: 'no_reference' })
    return
  }
  if (ref.currency !== input.currency) {
    logWarn('rate_guard_skipped', { orderId: input.orderId, reason: 'currency_mismatch', refCurrency: ref.currency, shipCurrency: input.currency })
    return
  }
  const absTol = envNum('RATE_MATCH_YEN_TOLERANCE', 300)
  const pctTol = envNum('RATE_MATCH_PERCENT_TOLERANCE', 2)
  const diff = Math.abs(input.shipTotal - ref.total)
  const threshold = Math.max(absTol, Math.floor(ref.total * (pctTol / 100)))
  if (diff > threshold) {
    const err: any = new Error('Rate mismatch')
    err.code = 'RATE_MISMATCH'
    err.status = 409
    throw err
  }
}
