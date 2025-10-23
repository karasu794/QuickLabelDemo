import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Test helpers for RLS / visibility checks.
 *
 * ENV required:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (for authenticated client)
 * - SUPABASE_SERVICE_ROLE_KEY (for service client)
 * Optional (to truly test authenticated RLS):
 * - TEST_AUTH_EMAIL
 * - TEST_AUTH_PASSWORD
 */

const SB_URL = process.env.SUPABASE_URL as string
const SB_ANON = process.env.SUPABASE_ANON_KEY as string
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const TEST_EMAIL = process.env.TEST_AUTH_EMAIL as string | undefined
const TEST_PASSWORD = process.env.TEST_AUTH_PASSWORD as string | undefined

function assertEnv(...keys: string[]) {
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`[supabaseClients] Missing env: ${missing.join(', ')}`)
  }
}

export async function getClient(role: 'service' | 'authenticated'): Promise<SupabaseClient> {
  assertEnv('SUPABASE_URL')
  if (role === 'service') {
    assertEnv('SUPABASE_SERVICE_ROLE_KEY')
    return createClient(SB_URL, SB_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  // authenticated
  assertEnv('SUPABASE_ANON_KEY')
  const client = createClient(SB_URL, SB_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  if (TEST_EMAIL && TEST_PASSWORD) {
    const { error } = await client.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })
    if (error) throw error
  }
  return client
}

/** Count rows with optional equality filters (RLS-aware). */
export async function countRows(table: string, role: 'service' | 'authenticated', match?: Record<string, any>): Promise<number> {
  const client = await getClient(role)
  let q: any = client.from(table).select('*', { count: 'exact', head: true })
  if (match) {
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v as any)
  }
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

/** Sample rows for manual inspection (RLS-aware). */
export async function sampleRows<T = any>(table: string, role: 'service' | 'authenticated', limit = 5, match?: Record<string, any>): Promise<T[]> {
  const client = await getClient(role)
  let q: any = client.from(table).select('*').limit(limit)
  if (match) {
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v as any)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as T[]
}

/** Convenience: parity check helper */
export async function visibilityParity(table: string, match?: Record<string, any>) {
  const svc = await countRows(table, 'service', match)
  const aut = await countRows(table, 'authenticated', match)
  return { service: svc, authenticated: aut }
}


