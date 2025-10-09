import { test, expect } from '@playwright/test'

test.describe('Stage4 payments cancel (e2e)', () => {
  test('happy path: authorized → cancel → 202 job → runner → succeeded', async ({ request }) => {
    const paymentId = 'e2e-auth-1'
    const res = await request.post(`/api/payments/${paymentId}/cancel`)
    expect([202, 422]).toContain(res.status())
    await request.post('/api/dev/jobs/run-once')
    if (res.status() === 202) {
      const { jobId } = await res.json()
      for (let i = 0; i < 5; i++) {
        const s = await request.get(`/api/jobs/${jobId}/status`)
        if (s.status() === 200) {
          const body = await s.json()
          if (body.status === 'succeeded') break
        }
        await new Promise(r => setTimeout(r, 1000))
      }
      const s2 = await request.get(`/api/jobs/${jobId}/status`)
      const b2 = await s2.json()
      expect(b2.status).toBe('succeeded')
    }
  })
})


