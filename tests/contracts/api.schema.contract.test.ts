import { NextRequest } from 'next/server'

describe('Schema-validated APIs', () => {
  test('GET /api/diagnostics/runtime-logs: minimal -> 200', async () => {
    const mod = await import('@/app/api/diagnostics/runtime-logs/route')
    const url = new URL('http://localhost/api/diagnostics/runtime-logs')
    const req = { url: url.toString(), headers: new Headers() } as unknown as NextRequest
    const res = await (mod.GET as any)(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.items)).toBe(true)
  })

  test('GET /api/diagnostics/runtime-logs: bad limit -> 422', async () => {
    const mod = await import('@/app/api/diagnostics/runtime-logs/route')
    const url = new URL('http://localhost/api/diagnostics/runtime-logs?limit=-1')
    const req = { url: url.toString(), headers: new Headers() } as unknown as NextRequest
    const res = await (mod.GET as any)(req)
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBe('validation_error')
    expect(Array.isArray(json.issues)).toBe(true)
  })

  test('POST /api/run-e2e: minimal -> 200', async () => {
    const mod = await import('@/app/api/run-e2e/route')
    const body = { suite: 'smoke' }
    const req = new Request('http://localhost/api/run-e2e', { method: 'POST', body: JSON.stringify(body) })
    const res = await (mod.POST as any)(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.jobId).toBe('string')
  })

  test('POST /api/run-e2e: missing suite -> 422', async () => {
    const mod = await import('@/app/api/run-e2e/route')
    const req = new Request('http://localhost/api/run-e2e', { method: 'POST', body: JSON.stringify({}) })
    const res = await (mod.POST as any)(req)
    expect(res.status).toBe(422)
  })

  test('GET /api/runs/[jobId]: minimal -> 200', async () => {
    const mod = await import('@/app/api/runs/[jobId]/route')
    const req = { url: 'http://localhost/api/runs/x', headers: new Headers() } as unknown as NextRequest
    const res = await (mod.GET as any)(req, { params: { jobId: 'x' } })
    expect(res.status).toBe(200)
  })

  test('GET /api/runs/[jobId]: missing -> 422', async () => {
    const mod = await import('@/app/api/runs/[jobId]/route')
    const req = { url: 'http://localhost/api/runs/', headers: new Headers() } as unknown as NextRequest
    const res = await (mod.GET as any)(req, { params: { jobId: '' } })
    expect(res.status).toBe(422)
  })

  test('POST /api/hts/suggest: minimal -> 200', async () => {
    const mod = await import('@/app/api/hts/suggest/route')
    const req = new Request('http://localhost/api/hts/suggest', { method: 'POST', body: JSON.stringify({ weightKg: 1, originCountry: 'JP' }) })
    const res = await (mod.POST as any)(req)
    expect(res.status).toBe(200)
  })

  test('POST /api/hts/suggest: missing fields -> 422', async () => {
    const mod = await import('@/app/api/hts/suggest/route')
    const req = new Request('http://localhost/api/hts/suggest', { method: 'POST', body: JSON.stringify({}) })
    const res = await (mod.POST as any)(req)
    expect(res.status).toBe(422)
  })
})


