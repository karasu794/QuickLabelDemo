import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

test('health guarded by bearer', async ({ request }) => {
  const res1 = await request.get(`${BASE}/api/dev/health`)
  expect(res1.status()).toBe(401)

  const token = process.env.ACTIONS_TOKEN || ''
  const res2 = await request.get(`${BASE}/api/dev/health`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res2.status()).toBe(200)
  const json = await res2.json()
  expect(json.ok).toBeTruthy()
})


