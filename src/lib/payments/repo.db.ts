import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { PaymentRecord } from './types'

type Row = Database['public']['Tables']['payments']['Row']
type Insert = Database['public']['Tables']['payments']['Insert']
type Update = Database['public']['Tables']['payments']['Update']

function toRecord(row: Row): PaymentRecord {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    status: row.status as any,
    refundedAmount: row.refunded_amount ?? 0,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function toInsert(rec: PaymentRecord): Insert {
  return {
    id: rec.id,
    amount: rec.amount,
    currency: rec.currency,
    status: rec.status as any,
    refunded_amount: rec.refundedAmount ?? 0,
  }
}

function toUpdate(patch: Partial<PaymentRecord>): Update {
  return {
    amount: patch.amount as any,
    currency: patch.currency as any,
    status: patch.status as any,
    refunded_amount: patch.refundedAmount as any,
  }
}

export const paymentsRepoDb = {
  async get(id: string): Promise<PaymentRecord | undefined> {
    const sb = createServiceRoleClient()
    const { data, error } = await sb.from('payments').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? toRecord(data) : undefined
  },
  async upsert(rec: PaymentRecord): Promise<PaymentRecord> {
    const existing = await this.get(rec.id)
    if (existing) return await this.update(rec.id, rec)
    const sb = createServiceRoleClient()
    const ins = await sb.from('payments').insert(toInsert(rec)).select('*').single()
    if (ins.error) throw ins.error
    return toRecord(ins.data!)
  },
  async update(id: string, patch: Partial<PaymentRecord>): Promise<PaymentRecord> {
    const sb = createServiceRoleClient()
    const upd = await sb.from('payments').update(toUpdate(patch)).eq('id', id).select('*').single()
    if (upd.error) throw upd.error
    return toRecord(upd.data!)
  },
}


