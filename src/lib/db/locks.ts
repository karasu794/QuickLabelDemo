import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function withOrderAdvisoryLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
  const supabase = createServiceRoleClient()
  // transaction-scoped advisory lock on hashtext(order_id)
  await (supabase.rpc as any)('ql_advisory_xact_lock_order', { order_id: orderId })
  return fn()
}
