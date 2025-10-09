/* global jest */

async function withMocks(opts: { forceLetter?: boolean; forceSign?: boolean; userHas?: boolean; adminHas?: boolean }, fn: (mods: any) => Promise<void>) {
  jest.resetModules()
  // settings
  jest.doMock('@/lib/settings/getAppSettingBoolean', () => ({
    getAppSettingBoolean: async (k: string, _d: boolean) => (k.includes('LETTERHEAD') ? !!opts.forceLetter : !!opts.forceSign),
  }))
  jest.doMock('../../src/lib/settings/getAppSettingBoolean', () => ({
    getAppSettingBoolean: async (k: string, _d: boolean) => (k.includes('LETTERHEAD') ? !!opts.forceLetter : !!opts.forceSign),
  }))
  // supabase
  const adminRow = opts.adminHas ? { id: 'a1', storage_url: 'https://e/admin.png', content_type: 'image/png' } : null
  const userRow = opts.userHas ? { id: 'u1', storage_url: 'https://e/user.png', content_type: 'image/png' } : null
  const impl = () => ({
    createClient: () => ({
      from: (table: string) => ({
        select: (_: string) => ({
          order: (_: any, __?: any) => ({
            limit: (_n: number) => ({
              maybeSingle: async () => ({ data: table.includes('admin_') ? adminRow : userRow }),
            }),
          }),
          eq: (_k: string, _v: any) => ({
            order: (_: any, __?: any) => ({
              limit: (_n: number) => ({
                maybeSingle: async () => ({ data: userRow }),
              }),
            }),
          }),
        }),
      }),
    }),
  })
  jest.doMock('@/lib/supabase/server', impl)
  jest.doMock('../../src/lib/supabase/server', impl)

  let letters: any, signs: any
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    letters = require('../../src/lib/letterhead/getEffectiveLetterhead')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    signs = require('../../src/lib/signature/getEffectiveSignature')
  })
  await fn({ letters, signs })
}

describe('helpers: effective assets', () => {
  test('force true uses admin', async () => {
    await withMocks({ forceLetter: true, forceSign: true, adminHas: true, userHas: true }, async ({ letters, signs }) => {
      const l = await letters.getEffectiveLetterhead('user')
      const s = await signs.getEffectiveSignature('user')
      expect(l.source).toBe('admin')
      expect(s.source).toBe('admin')
    })
  })
  test('force false uses user when exists', async () => {
    await withMocks({ forceLetter: false, forceSign: false, adminHas: true, userHas: true }, async ({ letters, signs }) => {
      const l = await letters.getEffectiveLetterhead('user')
      const s = await signs.getEffectiveSignature('user')
      expect(l.source).toBe('user')
      expect(s.source).toBe('user')
    })
  })
  test('force false falls back to admin when no user asset', async () => {
    await withMocks({ forceLetter: false, forceSign: false, adminHas: true, userHas: false }, async ({ letters, signs }) => {
      const l = await letters.getEffectiveLetterhead('user')
      const s = await signs.getEffectiveSignature('user')
      expect(l.source).toBe('admin')
      expect(s.source).toBe('admin')
    })
  })
  test('no assets returns null', async () => {
    await withMocks({ forceLetter: false, forceSign: false, adminHas: false, userHas: false }, async ({ letters, signs }) => {
      const l = await letters.getEffectiveLetterhead('user')
      const s = await signs.getEffectiveSignature('user')
      expect(l).toBeNull()
      expect(s).toBeNull()
    })
  })
})


