import { paymentsRepoDb } from './repo.db'
import { paymentsRepoMemory } from './repo.memory'
import { decideBackendsFromHealth } from '@/lib/runtime/health'

let decided: { JOBS_BACKEND?: 'db'|'memory'; PAYMENTS_BACKEND?: 'db'|'memory' } | null = null
let deciding: Promise<void> | null = null

async function ensureDecided() {
  if (decided) return
  if (!deciding) {
    deciding = (async () => {
      try {
        const d = await decideBackendsFromHealth()
        decided = { JOBS_BACKEND: d.JOBS_BACKEND, PAYMENTS_BACKEND: d.PAYMENTS_BACKEND }
      } catch (e) {
        console.warn('[health] decideBackendsFromHealth failed, falling back to memory', e)
        decided = { JOBS_BACKEND: 'memory', PAYMENTS_BACKEND: 'memory' }
      }
    })()
  }
  await deciding
}

export function getPaymentsRepo() {
  if (process.env.PAYMENTS_BACKEND === 'db') return paymentsRepoDb
  if (process.env.PAYMENTS_BACKEND === 'memory') return paymentsRepoMemory
  if (!decided) { void ensureDecided(); return paymentsRepoMemory }
  return decided.PAYMENTS_BACKEND === 'db' ? paymentsRepoDb : paymentsRepoMemory
}


