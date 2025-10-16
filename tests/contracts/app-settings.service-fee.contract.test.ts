describe('App Settings: service_fee_percentage API', () => {
  test('GET /api/app-settings/service-fee returns number', async () => {
    const { GET } = await import('@/app/api/app-settings/service-fee/route')
    const res = await (GET as any)()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.serviceFeePercentage).toBe('number')
  })
})


