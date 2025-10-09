describe('runtime health', () => {
  test('health route returns backends and flags', async () => {
    const { GET } = await import('@/app/api/health/route')
    const res = await (GET as any)(new Request('http://x', { method: 'GET' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(['db','memory']).toContain(body.jobsBackend)
    expect(['db','memory']).toContain(body.paymentsBackend)
    expect(typeof body.ok).toBe('boolean')
  })

  test('ENV forced backends are respected', async () => {
    const restoreJ = process.env.JOBS_BACKEND
    const restoreP = process.env.PAYMENTS_BACKEND
    process.env.JOBS_BACKEND = 'memory'
    process.env.PAYMENTS_BACKEND = 'memory'
    try {
      jest.resetModules()
      const { GET } = await import('@/app/api/health/route')
      const res = await (GET as any)(new Request('http://x', { method: 'GET' }))
      const body = await res.json()
      expect(body.jobsBackend).toBe('memory')
      expect(body.paymentsBackend).toBe('memory')
    } finally {
      process.env.JOBS_BACKEND = restoreJ
      process.env.PAYMENTS_BACKEND = restoreP
    }
  })
})


