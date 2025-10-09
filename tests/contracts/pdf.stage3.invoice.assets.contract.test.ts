/* global jest */

async function withMocks(opts: { adminHas?: boolean; userHas?: boolean }, fn: (mods: any) => Promise<void>) {
  jest.resetModules()
  // settings: force false to test preference, then override per-case if needed
  jest.doMock('@/lib/settings/getAppSettingBoolean', () => ({
    getAppSettingBoolean: async () => false,
  }))
  jest.doMock('../../src/lib/settings/getAppSettingBoolean', () => ({
    getAppSettingBoolean: async () => false,
  }))
  const adminRow = opts.adminHas ? { id: 'a1', storage_url: 'https://e/admin.png', content_type: 'image/png' } : null
  const userRow = opts.userHas ? { id: 'u1', storage_url: 'https://e/user.png', content_type: 'image/png' } : null
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

describe('PDF template: asset resolution pre-stage', () => {
  test('user preferred when available', async () => {
    await withMocks({ userHas: true, adminHas: true }, async (mod) => {
      const buf = await mod.buildCommercialInvoicePDF({ supabase: {}, userId: 'me', exporterName: 'X' })
      const json = JSON.parse(Buffer.from(buf).toString('utf-8'))
      expect(json.letterhead.source).toBe('user')
      expect(json.signature.source).toBe('user')
    })
  })
  test('admin fallback when user missing', async () => {
    await withMocks({ userHas: false, adminHas: true }, async (mod) => {
      const buf = await mod.buildCommercialInvoicePDF({ supabase: {}, userId: 'me', exporterName: 'X' })
      const json = JSON.parse(Buffer.from(buf).toString('utf-8'))
      expect(json.letterhead.source).toBe('admin')
      expect(json.signature.source).toBe('admin')
    })
  })
  test('null when neither available', async () => {
    await withMocks({ userHas: false, adminHas: false }, async (mod) => {
      const buf = await mod.buildCommercialInvoicePDF({ supabase: {}, userId: 'me', exporterName: 'X' })
      const json = JSON.parse(Buffer.from(buf).toString('utf-8'))
      expect(json.letterhead).toBeNull()
      expect(json.signature).toBeNull()
    })
  })
})


