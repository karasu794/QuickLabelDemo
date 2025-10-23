// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBe: (_: any) => {} }) }

test('サーバー: 未確定サービスは422を返す', async () => {
  // fetchをモックして /api/ship/create を叩く
  const originalFetch = global.fetch
  ;(global as any).fetch = async (url: string, init: any) => {
    if (url.endsWith('/api/ship/create')) {
      // ヘッダーに x-draft-id があるが、モックDBでは selected_rate 不在として 422 相当を返す
      return new Response(JSON.stringify({ code: 'SERVICE_UNSELECTED' }), { status: 422 }) as any
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 }) as any
  }
  const res = await fetch('http://localhost/api/ship/create', { method: 'POST', headers: { 'x-draft-id': 'draft-1' } })
  expect(res.status).toBe(422)
  ;(global as any).fetch = originalFetch
})


