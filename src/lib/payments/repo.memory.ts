import { paymentsStore } from './store'
import type { PaymentRecord } from './types'

export const paymentsRepoMemory = {
  async get(id: string): Promise<PaymentRecord | undefined> {
    return paymentsStore.get(id)
  },
  async upsert(rec: PaymentRecord): Promise<PaymentRecord> {
    paymentsStore.upsert(rec)
    return rec
  },
  async update(id: string, patch: Partial<PaymentRecord>): Promise<PaymentRecord> {
    const cur = paymentsStore.get(id)
    if (!cur) throw new Error('NOT_FOUND')
    const next: PaymentRecord = { ...cur, ...patch }
    paymentsStore.upsert(next)
    return next
  },
}


