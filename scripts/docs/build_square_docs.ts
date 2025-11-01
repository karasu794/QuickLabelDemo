import 'dotenv/config'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = process.env.SQUARE_DOCS_OUT || 'docs/vendors/square'
const SPEC = path.join(OUT_DIR, 'openapi.json')
const GEN_OUT = process.env.SQUARE_GEN_OUT || 'src/gen/square'

if (!fs.existsSync(SPEC)) { console.error('missing openapi.json; run docs:square:sync'); process.exit(1) }
fs.mkdirSync(GEN_OUT, { recursive: true })

// 1) TS型生成
execSync(`pnpm exec openapi-typescript ${SPEC} --output ${path.join(GEN_OUT, 'schema.d.ts')}`, { stdio: 'inherit' })

// 2) Zodクライアント生成
execSync(`pnpm exec openapi-zod-client --openapi ${SPEC} --output ${path.join(GEN_OUT, 'zod-client.ts')} --with-deprecated false`, { stdio: 'inherit' })

// 3) Markdown（widdershins）
const md = path.join(OUT_DIR, 'reference.md')
try { execSync(`pnpm exec widdershins --search false --language_tabs 'typescript:TypeScript' -o ${md} ${SPEC}`, { stdio: 'inherit' }) } catch {}

// 4) HTML（Redoc）
const html = path.join(OUT_DIR, 'reference.html')
try { execSync(`pnpm exec redocly build-docs ${SPEC} -o ${html}`, { stdio: 'inherit' }) } catch {}

console.log('[square-docs] generated: schema.d.ts, zod-client.ts, reference.md, reference.html')


