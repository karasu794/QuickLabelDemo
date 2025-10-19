import fetch from 'node-fetch'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const URL = `${BASE}/api/dev/health`

// このテストは「形」を保証することが目的。ガード有無の差分は次のE2E側で判定。

describe('GET /api/dev/health - shape', () => {
  test('returns JSON with required keys when authorized or unguarded', async () => {
    const headers: Record<string, string> = {}
    const wantAuth = !!process.env.ACTIONS_TOKEN
    if (wantAuth) headers['Authorization'] = `Bearer ${process.env.ACTIONS_TOKEN}`

    const res = await fetch(URL, { headers })
    // ガードありでトークン未設定だと 401 になり得るため、その場合はスキップ扱い
    if (res.status === 401) {
      console.warn('health guarded: set ACTIONS_TOKEN to run full shape test')
      return
    }
    expect(res.status).toBe(200)
    const json = await res.json()
    for (const k of ['ok','env','openai','supabase','ts','guarded']) {
      expect(Object.keys(json)).toContain(k)
    }
    expect(typeof json.ok).toBe('boolean')
    expect(typeof json.openai).toBe('boolean')
    expect(typeof json.supabase).toBe('boolean')
  })
})


