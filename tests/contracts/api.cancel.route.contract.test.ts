// @ts-nocheck
import fetch from 'node-fetch'

const base = process.env.E2E_BASE_URL || 'http://localhost:3000'

describe('API Contract: /api/ship/cancel (Finalized)', () => {
  it('returns structured body with ok/status and does not hang', async () => {
    const res = await fetch(`${base}/api/ship/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'admin=1' },
      body: JSON.stringify({ trackingNumber: 'demo-track' }),
    })
    expect([200, 204, 207]).toContain(res.status)
    const body = await res.json()
    expect(body).toHaveProperty('ok')
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['ok']))
  })
})


