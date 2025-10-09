/* global jest */
import path from 'path'

const routePath = path.resolve(process.cwd(), 'src/app/api/invoice/preview/route.ts')

function setEnv(key: string, val?: string) {
  const prev = process.env[key]
  if (val === undefined) delete process.env[key]
  else process.env[key] = val
  return () => {
    if (prev === undefined) delete process.env[key]
    else process.env[key] = prev
  }
}

function reloadRouteByRequire() {
  try { delete (require as any).cache[require.resolve(routePath)] } catch {}
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(routePath)
}

describe('/api/invoice/preview (PREVIEW_MODE variants)', () => {
  test('data-url: 200 + application/json + {url}', async () => {
    const restore = setEnv('PREVIEW_MODE', 'data-url')
    try {
      const { GET } = reloadRouteByRequire()
      const req = new Request('http://localhost/api/invoice/preview', { method: 'GET' })
      const res = await (GET as any)(req)
      expect(res.status).toBe(200)
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      expect(ct).toMatch(/application\/json/)
      const body = await res.json()
      expect(typeof body?.url).toBe('string')
      expect(
        body.url.startsWith('data:application/pdf;base64,') ||
        body.url.startsWith('/static/')
      ).toBe(true)
    } finally { restore() }
  })

  test('inline-pdf: 200 + (application/pdf %PDF) or JSON {url} fallback', async () => {
    const restore = setEnv('PREVIEW_MODE', 'inline-pdf')
    try {
      const { GET } = reloadRouteByRequire()
      const req = new Request('http://localhost/api/invoice/preview', { method: 'GET' })
      const res = await (GET as any)(req)
      expect(res.status).toBe(200)
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (/application\/pdf/.test(ct)) {
        const ab = await res.arrayBuffer()
        const head = Buffer.from(ab).subarray(0, 4).toString('utf8')
        expect(head).toBe('%PDF')
      } else {
        const body = await res.json()
        const url = String(body?.url || '')
        expect(url.length > 0).toBe(true)
        expect(
          url.startsWith('data:application/pdf') ||
          url.endsWith('.pdf') ||
          url.startsWith('/static/')
        ).toBe(true)
      }
    } finally { restore() }
  })
})


