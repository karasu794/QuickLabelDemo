/* global jest */

const dbg = (...a: any[]) => process.stderr.write(a.join(' ') + '\n')
process.on('unhandledRejection', (e: any) => dbg('[unhandledRejection]', e?.stack || e))
process.on('uncaughtException', (e: any) => dbg('[uncaughtException]', e?.stack || e))

function mockNext() {
  const mk = (body: any, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    headers: { set: () => {} },
    json: async () => body,
  })
  jest.doMock('next/server', () => ({ NextResponse: { json: mk } }))
}

function implSupabase(isAdmin: boolean) {
  const store: any[] = []
  return () => ({
    createClient: () => ({
      auth: {
        getUser: async () => ({ data: { user: isAdmin ? { id: 'u1' } : null } }),
      },
      storage: {
        from: () => ({
          upload: async (_k: string, _b: any, _o: any) => ({ error: null }),
          getPublicUrl: (_k: string) => ({ data: { publicUrl: 'https://example.com/x.png' } }),
        }),
      },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: (_cols: string) => ({
              eq: (_k: string, _v: any) => ({
                maybeSingle: async () => ({ data: isAdmin ? { role: 'admin', is_admin: true } : null, error: null }),
              }),
            }),
          }
        }
        return {
          select: (_: string) => ({ order: () => Promise.resolve({ data: store, error: null }) }),
          insert: (row: any) => ({ select: () => ({ single: async () => ({ data: { id: 'a1', ...row }, error: null }) }) }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
      },
    }),
  })
}

function mockSupabase(isAdmin: boolean) {
  jest.doMock('@/lib/supabase/server', implSupabase(isAdmin))
  jest.doMock('../../src/lib/supabase/server', implSupabase(isAdmin))
}

async function withMocks(isAdmin: boolean, path: 'letterhead' | 'signature', fn: (route: any) => Promise<void>) {
  jest.resetModules()
  mockNext()
  mockSupabase(isAdmin)
  let route: any
  jest.isolateModules(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      route = require(`../../src/app/api/admin/assets/${path}/route`)
    } catch (e: any) {
      dbg('[require-failed]', e?.stack || e)
      throw e
    }
  })
  return fn(route)
}

describe('admin assets api', () => {
  for (const path of ['letterhead', 'signature'] as const) {
    test(`${path}: POST/GET/DELETE admin ok`, async () => {
      await withMocks(true, path, async (route) => {
        const fd = new FormData()
        fd.append('file', new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' }))
        const res1 = await route.POST(new Request('http://x', { method: 'POST', body: fd as any }))
        expect(res1.status).toBe(200)
        const body1 = await res1.json()
        expect(body1.url).toContain('https://')

        const res2 = await route.GET()
        expect(res2.status).toBe(200)

        const res3 = await route.DELETE(new Request('http://x?id=a1'))
        expect(res3.status).toBe(200)
      })
    })

    test(`${path}: non-admin forbidden`, async () => {
      await withMocks(false, path, async (route) => {
        const res = await route.GET()
        expect(res.status).toBe(403)
      })
    })
  }
})


