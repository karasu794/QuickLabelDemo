/* global jest */

async function withMocks(rows: { admin?: boolean; user?: boolean } = { admin: true, user: true }, fn: (mod: any) => Promise<void>) {
  jest.resetModules()
  process.env.PDF_BUILDER = 'pdf-lib'
  jest.doMock('@/lib/settings/getAppSettingBoolean', () => ({ getAppSettingBoolean: async () => false }))
  jest.doMock('../../src/lib/settings/getAppSettingBoolean', () => ({ getAppSettingBoolean: async () => false }))
  const adminRow = rows.admin ? { id: 'a1', storage_url: 'https://e/admin.jpg', content_type: 'image/jpeg' } : null
  const userRow = rows.user ? { id: 'u1', storage_url: 'https://e/user.jpg', content_type: 'image/jpeg' } : null
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
  // fetch をモック（画像バイト）
  global.fetch = jest.fn(async (url: any) => {
    // 超小さなjpgダミー（実際はpng/jpg判定用）
    const dummy = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    return {
      arrayBuffer: async () => dummy.buffer,
    } as any
  })

  let mod: any
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../../src/lib/pdf/commercialInvoiceTemplate')
  })
  await fn(mod)
}

describe('Stage4 pdf-lib builder (if available)', () => {
  const enable = process.env.ENABLE_PDFLIB_TESTS === '1'
  let resolved = false
  try {
    require.resolve('pdf-lib')
    resolved = true
  } catch {}

  const canRun = enable && resolved

  ;(canRun ? test : test.skip)('generates buffer; falls back if pdf-lib unavailable', async () => {
    await withMocks({ admin: true, user: false }, async (mod) => {
      const buf = await mod.buildCommercialInvoicePDF({ supabase: {}, userId: 'me', exporterName: 'X' })
      expect(Buffer.isBuffer(buf)).toBe(true)
      expect(buf.length).toBeGreaterThan(0)
    })
  })
})


