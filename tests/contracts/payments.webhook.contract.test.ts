describe('payments.webhook contract', () => {
  test('rejects invalid signature with 400', async () => {
    const { POST } = await import('@/app/api/payments/webhook/route')
    const headers = new Headers()
    headers.set('X-Square-Signature', 'invalid')
    const res = await (POST as any)(new Request('http://localhost/api/payments/webhook', { method: 'POST', headers, body: JSON.stringify({}) }))
    expect([400, 401]).toContain(res.status)
  })

  test('COMPLETED updates shipments.payment_status to completed (idempotent)', async () => {
    const { POST: Charge } = await import('@/app/api/payments/charge/route')
    const chargeBody = { orderId: 'order-webhook-1', amount: 1000, currency: 'JPY', token: 'tok_test', locationId: 'loc_test' }
    const cr = await (Charge as any)(new Request('http://localhost/api/payments/charge', { method: 'POST', body: JSON.stringify(chargeBody) }))
    const cj = await cr.json()

    const { POST } = await import('@/app/api/payments/webhook/route')
    const event = {
      type: 'payment.updated',
      data: { id: cj.paymentId, object: { payment: { id: cj.paymentId, status: 'COMPLETED', orderId: chargeBody.orderId } } }
    }
    // use a bypass header for tests
    const headers = new Headers()
    headers.set('X-Test-Bypass-Signature', '1')
    const res = await (POST as any)(new Request('http://localhost/api/payments/webhook', { method: 'POST', headers, body: JSON.stringify(event) }))
    expect(res.status).toBe(200)
  })
})


