describe('payments.charge contract', () => {
  test('422 when required fields missing', async () => {
    const { POST } = await import('@/app/api/payments/charge/route')
    const res = await (POST as any)(new Request('http://localhost/api/payments/charge', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(typeof json.errors).toBe('object')
  })

  test('200 with ok:true and idempotent for same orderId when no Square config', async () => {
    const { POST } = await import('@/app/api/payments/charge/route')
    const body = { orderId: 'test-order-1', amount: 1234, currency: 'JPY', token: 'tok_test', locationId: 'loc_test' }
    const r1 = await (POST as any)(new Request('http://localhost/api/payments/charge', { method: 'POST', body: JSON.stringify(body) }))
    expect([200, 201]).toContain(r1.status)
    const j1 = await r1.json()
    expect(j1.ok).toBe(true)
    expect(j1.orderId).toBe(body.orderId)
    expect(typeof j1.paymentId).toBe('string')

    const r2 = await (POST as any)(new Request('http://localhost/api/payments/charge', { method: 'POST', body: JSON.stringify(body) }))
    const j2 = await r2.json()
    expect(j2.ok).toBe(true)
    expect(j2.paymentId).toBe(j1.paymentId)
  })
})


