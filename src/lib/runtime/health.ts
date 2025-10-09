import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export type HealthReport = {
  ok: boolean
  jobsOk: boolean
  paymentsOk: boolean
  details: string[]
}

let cached: Promise<HealthReport> | null = null

export async function checkDbHealth(): Promise<HealthReport> {
  const details: string[] = []
  let jobsOk = true
  let paymentsOk = true
  try {
    const sb = createServiceRoleClient()
    try {
      await sb.rpc('jobs_pick_for_update', { p_type: 'cancel_payment', p_now: new Date().toISOString() })
    } catch (e: any) {
      jobsOk = false
      details.push(`jobs rpc fail: ${e?.message ?? e}`)
    }
    try {
      const { error } = await sb.from('payments').select('id').limit(1)
      if (error) throw error
    } catch (e: any) {
      paymentsOk = false
      details.push(`payments select fail: ${e?.message ?? e}`)
    }
  } catch (e: any) {
    // client creation failure → 両方NG扱い
    jobsOk = false
    paymentsOk = false
    details.push(`client fail: ${e?.message ?? e}`)
  }
  return { ok: jobsOk && paymentsOk, jobsOk, paymentsOk, details }
}

export function getHealthReportOnce(): Promise<HealthReport> {
  if (!cached) cached = checkDbHealth()
  return cached
}

export type DecidedBackends = {
  JOBS_BACKEND: 'db' | 'memory'
  PAYMENTS_BACKEND: 'db' | 'memory'
  health: HealthReport
}

export async function decideBackendsFromHealth(): Promise<DecidedBackends> {
  const forcedJobs = process.env.JOBS_BACKEND as 'db' | 'memory' | undefined
  const forcedPayments = process.env.PAYMENTS_BACKEND as 'db' | 'memory' | undefined
  const health = await getHealthReportOnce()

  let j: 'db' | 'memory' = forcedJobs ?? (health.jobsOk ? 'db' : 'memory')
  let p: 'db' | 'memory' = forcedPayments ?? (health.paymentsOk ? 'db' : 'memory')

  if (forcedJobs === 'db' && !health.jobsOk) console.warn('[health] JOBS_BACKEND=db but jobs RPC unhealthy → staying db (forced)')
  if (forcedPayments === 'db' && !health.paymentsOk) console.warn('[health] PAYMENTS_BACKEND=db but payments table unhealthy → staying db (forced)')

  return { JOBS_BACKEND: j, PAYMENTS_BACKEND: p, health }
}


