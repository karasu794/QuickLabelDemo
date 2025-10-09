import 'server-only'
import { logWarn } from '@/lib/logging'

export type RGConfig = { require: boolean; maxPct?: number; maxAbs?: number }

export class RateGuardError extends Error {
  status = 400
  code = 'RATE_GUARD_MISMATCH' as const
  payload: any
  constructor(message: string, payload: any) {
    super(message)
    this.payload = payload
  }
}

const toNum = (v?: string | null) => (v == null || v === '' ? undefined : Number(v))

export function loadRGConfig(env: Record<string, string | undefined>): RGConfig {
  const require = (env.REQUIRE_RATE_MATCH ?? 'true').toLowerCase() === 'true'
  const maxPct = toNum(env.RATE_GUARD_MAX_PCT) ?? toNum(env.RATE_MATCH_PERCENT_TOLERANCE)
  const maxAbs = toNum(env.RATE_GUARD_MAX_ABS) ?? toNum(env.RATE_MATCH_YEN_TOLERANCE)
  return { require, maxPct, maxAbs }
}

// 合計で照合（箱ごとは将来拡張）
export function assertRateConsistency(refTotal: number | null, actualTotal: number, cfg: RGConfig) {
  if (refTotal == null) {
    if (cfg.require) {
      throw new RateGuardError('No reference total to compare', { ref: null, actual: actualTotal, diff: { pct: null, abs: null } })
    }
    return { ok: true, warnings: ['rate_guard:no_reference'] as const }
  }
  const abs = Math.abs(actualTotal - refTotal)
  const pct = refTotal === 0 ? (abs > 0 ? Infinity : 0) : abs / refTotal
  const hitPct = cfg.maxPct != null ? pct > cfg.maxPct : false
  const hitAbs = cfg.maxAbs != null ? abs > cfg.maxAbs : false
  const mismatch = (cfg.maxPct == null && cfg.maxAbs == null) ? false : (hitPct || hitAbs)
  if (mismatch && cfg.require) {
    throw new RateGuardError('Rate mismatch', { ref: refTotal, actual: actualTotal, diff: { pct, abs } })
  }
  return mismatch ? { ok: true, warnings: ['rate_guard:exceeded'], diff: { pct, abs } } : { ok: true, diff: { pct, abs } }
}

// 参照合計（最小実装・後続で強化）: 見積→決済→null
export async function fetchReferenceTotal(opts: { supabase: any; userId: string; shipmentDraftId?: string | null }): Promise<number | null> {
  const { supabase, userId } = opts
  try {
    const q = await (supabase
      .from('quote_jobs') as any)
      .select('total_amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (q?.data?.total_amount != null) return Number(q.data.total_amount)
  } catch {}
  try {
    const t = await (supabase
      .from('transactions') as any)
      .select('amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (t?.data?.amount != null) return Number(t.data.amount)
  } catch {}
  // TODO(stage2+): 実DBに合わせて優先順や参照先を強化
  return null
}
