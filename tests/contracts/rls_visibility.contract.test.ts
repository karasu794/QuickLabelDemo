import { expect, test } from '@jest/globals'
import { visibilityParity, sampleRows } from '../../src/tests/helpers/supabaseClients'

/**
 * RLS visibility contract
 * - Authenticated should never see MORE than service role
 * - Basic sanity: tables are reachable under both roles
 *
 * Optionally scope by ORG_ID via env.
 */
const ORG_ID = process.env.TEST_ORG_ID as string | undefined

function match() {
  return ORG_ID ? { org_id: ORG_ID } : undefined
}

const TABLES = ['shipments'] // 'attachments' テーブルは現状なし

for (const t of TABLES) {
  test(`[RLS] visibility parity: ${t}`, async () => {
    const { service, authenticated } = await visibilityParity(t, match())
    expect(service).toBeGreaterThanOrEqual(0)
    expect(authenticated).toBeGreaterThanOrEqual(0)
    // Authenticated must not exceed service visibility
    expect(authenticated).toBeLessThanOrEqual(service)
  })

  test(`[RLS] sample fetch ok: ${t}`, async () => {
    const rows = await sampleRows(t, 'authenticated', 3, match())
    expect(Array.isArray(rows)).toBe(true)
  })
}


