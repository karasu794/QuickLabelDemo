/* global jest */

function mockNext() {
  jest.doMock('next/server', () => ({
    NextResponse: {
      json: (b: any, i?: ResponseInit) => new Response(JSON.stringify(b), i),
    },
  }))
}

function implSupabase(authUserId: string | null, rows: any[] = []) {
  const store = [...rows]
  return () => ({
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: authUserId ? { id: authUserId } : null } }) },
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/u.png' } }),
          remove: async () => ({ data: null, error: null }),
        }),
      },
      from: (table: string) => ({
        select: (_cols: string) => ({
          eq: (_k: string, v: any) => ({
            order: () => Promise.resolve({ data: store.filter(r => r.owner_id === v), error: null }),
            maybeSingle: async () => ({ data: store.find(r => r.id === v) || null, error: null }),
          }),
        }),
        insert: (row: any) => ({ select: () => ({ single: async () => ({ data: { id: 'uu1', ...row }, error: null }) }) }),
        delete: () => ({ eq: (_k: string, v: any) => ({ eq: async (_k2: string, v2: any) => ({ error: v2 ? null : { message: 'forbidden' } }) }) }),
      }),
    }),
  })
}

function mockSupabase(authUserId: string | null, rows: any[] = []) {
  const impl = implSupabase(authUserId, rows)
  jest.doMock('@/lib/supabase/server', impl)
  jest.doMock('../../src/lib/supabase/server', impl)
}

async function withMocks(path: 'letterhead' | 'signature', authUserId: string | null, rows: any[], fn: (route: any) => Promise<void>) {
  jest.resetModules()
  mockNext()
  mockSupabase(authUserId, rows)
  let route: any
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    route = require(`../../src/app/api/mypage/assets/${path}/route`)
  })
  return fn(route)
}

describe('mypage assets api', () => {
  for (const path of ['letterhead', 'signature'] as const) {
    test(`${path}: GET unauth -> 401`, async () => {
      await withMocks(path, null, [], async (route) => {
        const res = await route.GET()
        expect(res.status).toBe(401)
      })
    })

    test(`${path}: POST unauth -> 401`, async () => {
      await withMocks(path, null, [], async (route) => {
        const fd = new FormData()
        fd.append('file', new File([new Uint8Array([1])], 'x.png', { type: 'image/png' }))
        const res = await route.POST(new Request('http://x', { method: 'POST', body: fd as any }))
        expect(res.status).toBe(401)
      })
    })

    test(`${path}: GET self assets -> 200 only own`, async () => {
      await withMocks(path, 'me', [
        { id: 'a', owner_id: 'me', storage_url: 'https://e/a.png', content_type: 'image/png' },
        { id: 'b', owner_id: 'you', storage_url: 'https://e/b.png', content_type: 'image/png' },
      ], async (route) => {
        const res = await route.GET()
        expect(res.status).toBe(200)
        const { items } = await res.json()
        expect(Array.isArray(items)).toBe(true)
        expect(items.every((x: any) => x.owner_id === 'me')).toBe(true)
      })
    })

    test(`${path}: POST/DELETE owner only`, async () => {
      await withMocks(path, 'me', [], async (route) => {
        const fd = new FormData()
        fd.append('file', new File([new Uint8Array([1])], 'x.png', { type: 'image/png' }))
        const res1 = await route.POST(new Request('http://x', { method: 'POST', body: fd as any }))
        expect(res1.status).toBe(200)
        const body1 = await res1.json()
        expect(body1.owner_id).toBe('me')

        const res2 = await route.DELETE(new Request('http://x?id=uu1'))
        expect(res2.status).toBe(200)
      })
    })
  }
})


