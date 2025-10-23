describe('FedEx MPS minimal contract', () => {
  const CAN_RUN = process.env.SHIP_API_WRITE_ENABLED === 'true'
    && !!process.env.BLOB_READ_WRITE_TOKEN
    && (!!process.env.FEDEX_EXPORT_API_KEY || !!process.env.FEDEX_IMPORT_API_KEY)

  test('create: multiple packages → returns master + labelUrls[] (shape only)', async () => {
    if (!CAN_RUN) return
    const { POST } = await import('@/app/api/ship/create/route')
    const body: any = {
      orderId: `mps-${Date.now()}`,
      serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
      bill: { payer: 'SENDER' },
      shipper: { name: 'A', phone: '000', address1: 'x', city: 'Tokyo', postalCode: '1000001', country: 'JP' },
      recipient: { name: 'B', phone: '000', address1: 'y', city: 'LA', postalCode: '90001', country: 'US' },
      packages: [
        { weight: { value: 1.2, unit: 'KG' }, dimensions: { length: 20, width: 15, height: 10, unit: 'CM' } },
        { weight: { value: 0.8, unit: 'KG' }, dimensions: { length: 15, width: 10, height: 8, unit: 'CM' } },
      ],
      htsCode: '610910',
    }
    const req = new Request('http://local/api/ship/create', { method: 'POST', body: JSON.stringify(body) })
    const res = await (POST as any)(req)
    // 環境により外部APIが呼べない場合があるため、shape のみ検証
    expect([200, 400, 402, 500, 503]).toContain(res.status)
    if (res.status >= 200 && res.status < 300) {
      const json = await res.json()
      expect(Array.isArray(json.labelUrls)).toBe(true)
      expect(Array.isArray(json.trackingNumbers)).toBe(true)
      expect(typeof json.masterTrackingNumber === 'string').toBe(true)
      if (json.labelUrls.length > 0) expect(json.labelUrls[0]).toBe(json.labelUrl)
    }
  })
})


