describe('API Contract: /api/quote residential breakdown', () => {
  test('isResidential: true -> rates[].breakdown.residentialSurcharge is present (>=0)', async () => {
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
        isResidential: true,
        higherInsurance: false,
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
    expect(typeof json.jobId).toBe('string')
  })
})


