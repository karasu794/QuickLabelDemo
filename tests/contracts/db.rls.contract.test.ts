import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

describe('RLS policy migrations (contract)', () => {
  const dir = join(process.cwd(), 'database', 'migrations')
  const files = [
    '20251007_rls_shipments.sql',
    '20251007_rls_open_shipments.sql',
    '20251007_rls_address_book.sql',
    '20251007_rls_drafts.sql',
  ]

  test('all migration files exist', () => {
    const existing = readdirSync(dir)
    for (const f of files) expect(existing).toContain(f)
  })

  function read(name: string): string {
    return readFileSync(join(dir, name), 'utf8')
  }

  const adminSelectRe = /CREATE POLICY\s+"Admin select [^"]+"[\s\S]*?FOR SELECT[\s\S]*?USING[\s\S]*?EXISTS[\s\S]*?public\.profiles[\s\S]*?auth\.uid\(\)[\s\S]*?\(p\.is_admin\s*=\s*TRUE\s*OR\s*p\.role\s*=\s*'admin'\)/i
  const ownerSelectRe = /CREATE POLICY\s+"Owner select [^"]+"[\s\S]*?FOR SELECT[\s\S]*?USING[\s\S]*?auth\.uid\(\)\s*=\s*user_id/i
  const ownerInsertRe = /CREATE POLICY\s+"Owner insert [^"]+"[\s\S]*?FOR INSERT[\s\S]*?WITH CHECK[\s\S]*?auth\.uid\(\)\s*=\s*user_id/i
  const ownerUpdateRe = /CREATE POLICY\s+"Owner update [^"]+"[\s\S]*?FOR UPDATE[\s\S]*?USING[\s\S]*?auth\.uid\(\)\s*=\s*user_id[\s\S]*?WITH CHECK[\s\S]*?auth\.uid\(\)\s*=\s*user_id/i
  const ownerDeleteRe = /CREATE POLICY\s+"Owner delete [^"]+"[\s\S]*?FOR DELETE[\s\S]*?USING[\s\S]*?auth\.uid\(\)\s*=\s*user_id/i
  const serviceRoleFullRe = /CREATE POLICY\s+"Service role full [^"]+"[\s\S]*?FOR ALL[\s\S]*?USING[\s\S]*?auth\.role\(\)\s*=\s*'service_role'[\s\S]*?WITH CHECK[\s\S]*?auth\.role\(\)\s*=\s*'service_role'/i
  const rollbackMarkRe = /--\s*ROLLBACK:/i

  test('shipments policies present', () => {
    const sql = read('20251007_rls_shipments.sql')
    expect(sql).toMatch(adminSelectRe)
    expect(sql).toMatch(ownerSelectRe)
    expect(sql).toMatch(ownerInsertRe)
    expect(sql).toMatch(ownerUpdateRe)
    expect(sql).toMatch(ownerDeleteRe)
    expect(sql).toMatch(serviceRoleFullRe)
    expect(sql).toMatch(rollbackMarkRe)
  })

  test('open_shipments policies present and anonymous policy removed', () => {
    const sql = read('20251007_rls_open_shipments.sql')
    const sqlNoComments = sql.replace(/^\s*--.*$/gm, '')
    expect(sql).toMatch(adminSelectRe)
    expect(sql).toMatch(ownerSelectRe)
    expect(sql).toMatch(ownerInsertRe)
    expect(sql).toMatch(ownerUpdateRe)
    expect(sql).toMatch(ownerDeleteRe)
    expect(sql).toMatch(serviceRoleFullRe)
    expect(sql).toMatch(rollbackMarkRe)
    // ensure legacy anonymous allowance is dropped (absence of USING (user_id IS NULL) in CREATE; allowed in DROP)
    expect(/CREATE POLICY[\s\S]*USING\s*\(\s*user_id\s+IS\s+NULL\s*\)/i.test(sqlNoComments)).toBe(false)
    // and a DROP POLICY for anonymous is present
    expect(/DROP POLICY IF EXISTS\s+"Allow anonymous access for session management"/i.test(sql)).toBe(true)
  })

  test('address_book policies present', () => {
    const sql = read('20251007_rls_address_book.sql')
    expect(sql).toMatch(adminSelectRe)
    expect(sql).toMatch(ownerSelectRe)
    expect(sql).toMatch(ownerInsertRe)
    expect(sql).toMatch(ownerUpdateRe)
    expect(sql).toMatch(ownerDeleteRe)
    expect(sql).toMatch(serviceRoleFullRe)
    expect(sql).toMatch(rollbackMarkRe)
  })

  test('drafts policies present', () => {
    const sql = read('20251007_rls_drafts.sql')
    expect(sql).toMatch(adminSelectRe)
    expect(sql).toMatch(ownerSelectRe)
    expect(sql).toMatch(ownerInsertRe)
    expect(sql).toMatch(ownerUpdateRe)
    expect(sql).toMatch(ownerDeleteRe)
    expect(sql).toMatch(serviceRoleFullRe)
    expect(sql).toMatch(rollbackMarkRe)
  })
})


