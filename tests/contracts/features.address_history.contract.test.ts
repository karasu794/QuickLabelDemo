describe('features: address history API', () => {
  test('bad request when role is missing (400)', async () => {
    const { GET } = await import('@/app/api/history/addresses/route')
    const res = await (GET as any)(new Request('http://local/api/history/addresses', { headers: new Headers({ 'X-Test-Bypass-Auth': '1' }) }))
    expect(res.status).toBe(400)
  })

  test('should enforce auth (401)', async () => {
    const { GET } = await import('@/app/api/history/addresses/route')
    const res = await (GET as any)(new Request('http://local/api/history/addresses?role=shipper'))
    expect(res.status).toBe(401)
  })

  test('should return 200 with items array (primary or fallback)', async () => {
    const { GET } = await import('@/app/api/history/addresses/route')
    const headers = new Headers()
    headers.set('X-Test-Bypass-Auth', '1')
    const res = await (GET as any)(new Request('http://local/api/history/addresses?role=shipper&limit=5', { headers }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.items)).toBe(true)
  })

  test('should return recent addresses for recipient', async () => {
    const { GET } = await import('@/app/api/history/addresses/route')
    const headers = new Headers()
    headers.set('X-Test-Bypass-Auth', '1')
    const res = await (GET as any)(new Request('http://local/api/history/addresses?role=recipient', { headers }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.items)).toBe(true)
  })

  test('should respect limit', async () => {
    const { GET } = await import('@/app/api/history/addresses/route')
    const headers = new Headers()
    headers.set('X-Test-Bypass-Auth', '1')
    const res = await (GET as any)(new Request('http://local/api/history/addresses?role=shipper&limit=1', { headers }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items.length).toBeLessThanOrEqual(1)
  })
})


