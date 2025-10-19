import { execFileSync } from 'node:child_process'
import path from 'node:path'

const SCRIPT = path.join(process.cwd(), 'scripts', 'ping-openai.mjs')

// 明示フラグがない場合はスキップ（意図しない課金を避ける）
const ENABLE = process.env.OPENAI_PING === '1'

describe('OpenAI API ping (optional)', () => {
  test('returns ok:true when enabled', () => {
    if (!ENABLE) {
      console.warn('SKIP openai ping: set OPENAI_PING=1 to enable')
      return // skip
    }
    const out = execFileSync('node', [SCRIPT], { encoding: 'utf8' })
    const json = JSON.parse(out)
    expect(json.ok).toBe(true)
    expect(json.status).toBe(200)
  })
})


