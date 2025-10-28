import { test, expect } from '@playwright/test'

const enabled = process.env.ALLOW_TEST_ROUTES === 'true'

test.skip(!enabled, 'test routes disabled')

test('publishHookdeck smoke: test.ping', async ({ request }) => {
  const res = await request.post('/api/_internal/test-hookdeck', {
    data: { type: 'test.ping', detail: { hello: 'world' } }
  })
  expect([200,500]).toContain(res.status())
  const json = await res.json()
  expect(json).toHaveProperty('ok')
})

test('error injections reach Hookdeck', async ({ request }) => {
  for (const kind of ['payment','ship','label']) {
    const res = await request.post('/api/_internal/trigger-error', { data: { kind } })
    expect([402,502,500,400]).toContain(res.status())
    const j = await res.json()
    expect(j.ok).toBe(false)
  }
})


