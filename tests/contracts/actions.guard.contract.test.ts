import fetch from 'node-fetch'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const GUARD = `${BASE}/api/dev/health`

// Helper
async function req(headers?: Record<string,string>) {
  return fetch(GUARD, { headers })
}

describe('Actions token guard', () => {
  test('401 without Authorization header', async () => {
    const res = await req()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthorized')
  })

  test('401 with wrong token', async () => {
    const res = await req({ Authorization: 'Bearer WRONG' })
    expect(res.status).toBe(401)
  })

  test('200 with correct token', async () => {
    const token = process.env.ACTIONS_TOKEN as string
    if (!token) throw new Error('ACTIONS_TOKEN not set for test')
    const res = await req({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.guarded).toBe(true)
  })
})


