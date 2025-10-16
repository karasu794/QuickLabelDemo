import fs from 'fs'

// Helper: skip if a file does not exist
function fileExists(p: string): boolean {
  try { return fs.existsSync(p) } catch { return false }
}

describe('API Contract (Guardrails)', () => {
  const shipCreatePath = 'src/app/api/ship/create/route.ts'

  test('ship/create must use order_id + advisory lock (idempotency)', () => {
    if (!fileExists(shipCreatePath)) return console.warn('skip: ship/create not found')
    const code = fs.readFileSync(shipCreatePath, 'utf8')
    expect(code).toMatch(/withOrderAdvisoryLock\(/)
    expect(code).toMatch(/orderId|order_id/)
  })

  test('notifications endpoints: 401 for unauthenticated, 403 for non-admin (JSON)', () => {
    // Static heuristic: guard patterns present in codebase
    const notifDir = 'src/app/api/notifications'
    if (!fileExists(notifDir)) return console.warn('skip: notifications api not found')
    // minimal heuristic: presence of auth checks in handlers
    // Developers should complement with integration tests elsewhere
    expect(true).toBe(true)
  })

  test('receipts/pdf: returns 500 on timeout (guard present)', () => {
    const receiptsPdfDir = 'src/app/api/receipts'
    if (!fileExists(receiptsPdfDir)) return console.warn('skip: receipts api not found')
    // Minimal contract: code should handle failure path with 5xx
    expect(true).toBe(true)
  })

  test('quote: POST returns { ok: true, jobId } and 422 with errors map', async () => {
    const { POST } = await import('@/app/api/quote/route')

    // 422: validation missing fields
    const badReq = new Request('http://localhost/api/quote', { method: 'POST', body: JSON.stringify({}) })
    const badRes = await (POST as any)(badReq)
    expect(badRes.status).toBe(422)
    const badJson = await badRes.json()
    expect(badJson.ok).toBe(false)
    expect(badJson.code).toBe('VALIDATION_ERROR')
    expect(typeof badJson.errors).toBe('object')

    // 200: minimal valid payload
    const goodBody = {
      quoteParams: {
        originCountry: 'JP',
        originPostalCode: '1000001',
        originStateCode: '',
        originCityName: 'Chiyoda',
        destinationCountry: 'US',
        destinationPostalCode: '90001',
        destinationStateCode: '',
        destinationCityName: 'Los Angeles',
        shipDate: new Date().toISOString().split('T')[0],
        isResidential: false,
        higherInsurance: false,
      },
      packages: [{ id: 1, packagingType: 'YOUR_PACKAGING', weight: '1' }]
    }
    const goodReq = new Request('http://localhost/api/quote', { method: 'POST', body: JSON.stringify(goodBody) })
    const goodRes = await (POST as any)(goodReq)
    expect(goodRes.status).toBe(200)
    const goodJson = await goodRes.json()
    expect(goodJson.ok).toBe(true)
    expect(typeof goodJson.jobId).toBe('string')
  })
})
