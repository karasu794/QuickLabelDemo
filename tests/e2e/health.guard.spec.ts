import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

// ガードの有無で挙動が変わるが、どちらでも落ちないように判定する

test('health endpoint responds (401 if guarded, 200 if unguarded or authorized)', async ({ request }) => {
  const res1 = await request.get(`${BASE}/api/dev/health`)
  if (res1.status() === 401) {
    // guarded パス：正しいトークンで 200 になることを確認
    const token = process.env.ACTIONS_TOKEN || ''
    expect(token).not.toEqual('')
    const res2 = await request.get(`${BASE}/api/dev/health`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res2.status()).toBe(200)
    const json = await res2.json()
    expect(json.ok).toBeTruthy()
    expect(json.guarded).toBeTruthy()
  } else {
    // unguarded パス：そのまま 200 で必要フィールドがある
    expect(res1.status()).toBe(200)
    const json = await res1.json()
    expect(json.ok).toBeTruthy()
    expect(Object.keys(json)).toEqual(expect.arrayContaining(['env','openai','supabase','ts']))
  }
})


