import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const SRC = process.env.SQUARE_OPENAPI_URL || ''
const OUT_DIR = process.env.SQUARE_DOCS_OUT || 'docs/vendors/square'
const SPEC = path.join(OUT_DIR, 'openapi.json')
const ETAG = path.join(OUT_DIR, '.etag')
const VERSION = path.join(OUT_DIR, 'VERSION')

if (!SRC) { console.error('SQUARE_OPENAPI_URL not set'); process.exit(1) }
fs.mkdirSync(OUT_DIR, { recursive: true })

function httpGet(url: string, headers: Record<string,string> = {}): Promise<{status:number, body:Buffer, headers:Record<string,string>}> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c)=>chunks.push(c))
      res.on('end', ()=>resolve({ status: res.statusCode||0, body: Buffer.concat(chunks), headers: Object.fromEntries(Object.entries(res.headers).map(([k,v])=>[k.toLowerCase(), Array.isArray(v)?v.join(','):String(v||'')])) }))
    }).on('error', reject)
  })
}

(async () => {
  const prevTag = fs.existsSync(ETAG) ? fs.readFileSync(ETAG, 'utf8') : ''
  const h: Record<string,string> = {}
  if (prevTag) h['If-None-Match'] = prevTag
  const r = await httpGet(SRC, h)
  if (r.status === 304 && fs.existsSync(SPEC)) {
    console.log('[square-docs] up-to-date (304)')
    process.exit(0)
  }
  if (r.status < 200 || r.status >= 300) {
    console.error('[square-docs] fetch failed', r.status)
    process.exit(1)
  }
  // 保存
  fs.writeFileSync(SPEC, r.body)
  const etag = r.headers['etag'] || ''
  if (etag) fs.writeFileSync(ETAG, etag)
  // version 抽出
  try {
    const json = JSON.parse(r.body.toString('utf8'))
    const ver = json?.info?.version || 'unknown'
    fs.writeFileSync(VERSION, String(ver))
    console.log('[square-docs] saved', { etag, version: ver })
  } catch {
    console.warn('[square-docs] saved (no version)')
  }
})().catch((e)=>{ console.error(e); process.exit(1) })


