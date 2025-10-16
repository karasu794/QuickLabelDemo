describe('API Contract: /api/quote tolerant validation', () => {
  test('missing higherInsurance + declaredValue>0 -> 200 (server auto-complement)', async () => {
    const { POST } = await import('@/app/api/quote/route')

    const body = {
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
        // higherInsurance is intentionally omitted
      },
      packages: [
        { id: 1, packagingType: 'YOUR_PACKAGING', weight: '1', length: '0', width: '0', height: '0', declaredValue: '1000' }
      ]
    }

    const req = new Request('http://localhost/api/quote', { method: 'POST', body: JSON.stringify(body) })
    const res = await (POST as any)(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(typeof json.jobId).toBe('string')
  })

  test('higherInsurance=true & totalDeclared=0 -> 200 + WARN (coerced to false)', async () => {
    const { POST } = await import('@/app/api/quote/route')

    const body = {
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
        higherInsurance: true,
      },
      packages: [
        { id: 1, packagingType: 'YOUR_PACKAGING', weight: '1', length: '0', width: '0', height: '0', declaredValue: '0' }
      ]
    }

    const req = new Request('http://localhost/api/quote', { method: 'POST', body: JSON.stringify(body) })
    const res = await (POST as any)(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    // WARN ログの部分一致検証
    expect((console as any).warn).toHaveBeenCalled()
    const calls = (console as any).warn.mock.calls.flat().join('\n')
    expect(calls).toContain('higherInsurance=true but declaredValue=0')
  })
})


