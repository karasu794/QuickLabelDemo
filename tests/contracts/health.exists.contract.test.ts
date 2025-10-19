import fetch from 'node-fetch'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

// Guard の有無で結果が分岐するため、200 or 401 のどちらでも良いが、
// エンドポイントが存在し応答することを確認する。

describe('health endpoint exists', () => {
  test('responds with 200 or 401', async () => {
    const res = await fetch(`${BASE}/api/dev/health`)
    expect([200,401]).toContain(res.status)
  })
})


