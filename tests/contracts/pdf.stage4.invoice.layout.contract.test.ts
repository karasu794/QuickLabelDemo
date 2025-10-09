/* global jest */

async function withMocks(rows: { admin?: boolean; user?: boolean } = { admin: true, user: true }, fn: (mod: any) => Promise<void>) {
  jest.resetModules()
  // settings: force flags are resolved via helpers, which rely on admin/user asset presence
  jest.doMock('@/lib/settings/getAppSettingBoolean', () => ({ getAppSettingBoolean: async () => false }))
  jest.doMock('../../src/lib/settings/getAppSettingBoolean', () => ({ getAppSettingBoolean: async () => false }))

  const adminRow = rows.admin ? { id: 'a1', storage_url: 'https://e/admin.png', content_type: 'image/png' } : null
  const userRow = rows.user ? { id: 'u1', storage_url: 'https://e/user.png', content_type: 'image/png' } : null
  const impl = () => ({
    createClient: () => ({
      from: (table: string) => ({
        select: (_: string) => ({
          order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: table.includes('admin_') ? adminRow : userRow }) }) }),
          eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: userRow }) }) }) }),
        }),
      }),
    }),
  })
  jest.doMock('@/lib/supabase/server', impl)
  jest.doMock('../../src/lib/supabase/server', impl)

  let mod: any
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../../src/lib/pdf/commercialInvoiceTemplate')
  })
  await fn(mod)
}

describe('Stage4 PDF layout (token adapter)', () => {
  test('OFF: user preferred, tokens present', async () => {
    await withMocks({ admin: true, user: true }, async (mod) => {
      const buf = await mod.buildCommercialInvoicePDF({ supabase: {}, userId: 'me', exporterName: 'X' })
      const text = Buffer.from(buf).toString('utf-8')
      expect(text).toContain('FQL:PAGE@595,842,M=68')
      expect(text).toMatch(/FQL:HEADER@\d+,\d+,\d+,\d+\|URL=https:\/\/e\/user\.png/)
      expect(text).toMatch(/FQL:SIGN@\d+,\d+,\d+,\d+\|URL=https:\/\/e\/user\.png/)
    })
  })

  test('OFF: no user -> admin fallback', async () => {
    await withMocks({ admin: true, user: false }, async (mod) => {
      const buf = await mod.buildCommercialInvoicePDF({ supabase: {}, userId: 'me', exporterName: 'X' })
      const text = Buffer.from(buf).toString('utf-8')
      expect(text).toContain('FQL:PAGE@595,842,M=68')
      expect(text).toMatch(/FQL:HEADER@\d+,\d+,\d+,\d+\|URL=https:\/\/e\/admin\.png/)
      expect(text).toMatch(/FQL:SIGN@\d+,\d+,\d+,\d+\|URL=https:\/\/e\/admin\.png/)
    })
  })
})


