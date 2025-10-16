describe('features: address_book API personal only', () => {
  test('401 when unauthenticated', async () => {
    const { GET } = await import('@/app/api/address-book/route')
    const res = await (GET as any)()
    expect(res.status).toBe(401)
  })

  test('200 returns array (shape only, bypassed)', async () => {
    // For contract shape, we bypass auth via module mock of getUserOrThrow
    jest.resetModules()
    jest.doMock('../../src/lib/auth/getUserOrThrow', () => ({
      getUserOrThrow: async () => ({
        supabase: {
          from() {
            return {
              select() { return this },
              or() { return this },
              order() { return this },
              limit() { return { data: [], error: null } },
            } as any
          },
        },
        user: { id: 'u-test' },
      })
    }))
    const { GET } = await import('@/app/api/address-book/route')
    const res = await (GET as any)()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
  })
})


