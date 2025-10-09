import type { JobEventRecord, JobRecord, JobStatus } from '@/lib/payments/types'
import * as mem from './repo'
import * as db from './repo.db'
import { decideBackendsFromHealth } from '@/lib/runtime/health'

export type JobsRepo = {
  get(id: string): Promise<JobRecord | undefined>
  pickAndLock?(type: 'cancel_payment'): Promise<JobRecord | null>
  findReady?(): Promise<JobRecord | undefined>
  tryLock?(id: string): Promise<boolean>
  upsert(job: JobRecord): Promise<JobRecord>
  upsertByIdempotencyKey(job: JobRecord): Promise<JobRecord>
  updateStatus(jobId: string, status: JobStatus, fields?: Partial<JobRecord>): Promise<JobRecord | undefined>
  appendEvent(ev: JobEventRecord): Promise<void>
  listEvents(jobId: string): Promise<JobEventRecord[]>
}

function memoryAdapter(): JobsRepo {
  return {
    async get(id) { return mem.jobRepo.get(id) },
    async findReady() { return mem.jobRepo.findReady() },
    async tryLock(id) { return mem.jobRepo.tryLock(id) },
    async pickAndLock(type: 'cancel_payment') {
      const j = mem.jobRepo.findReady()
      if (!j) return null
      if (!mem.jobRepo.tryLock(j.id)) return null
      return mem.jobRepo.updateStatus(j.id, 'running') || j
    },
    async upsert(job) { return mem.jobRepo.upsert(job) },
    async upsertByIdempotencyKey(job) { return mem.jobRepo.upsertByIdempotencyKey(job) },
    async updateStatus(id, status, fields) { return mem.jobRepo.updateStatus(id, status, fields || {}) },
    async appendEvent(ev) { mem.jobRepo.appendEvent(ev) },
    async listEvents(jobId) { return mem.jobRepo.listEvents(jobId) },
  }
}

function dbAdapter(): JobsRepo {
  return {
    get: db.get,
    pickAndLock: db.pickAndLock,
    upsert: db.upsert,
    upsertByIdempotencyKey: db.upsertByIdempotencyKey,
    tryLock: async () => false,
    findReady: async () => undefined,
    updateStatus: db.updateStatus,
    appendEvent: db.appendEvent,
    listEvents: db.listEvents,
  }
}

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

export function getJobsRepo(): JobsRepo {
  if (process.env.JOBS_BACKEND === 'db') return dbAdapter()
  if (process.env.JOBS_BACKEND === 'memory') return memoryAdapter()
  if (!decided) { void ensureDecided(); return memoryAdapter() }
  return decided.JOBS_BACKEND === 'db' ? dbAdapter() : memoryAdapter()
}


