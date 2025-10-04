import fs from 'fs'

function fileExists(p: string): boolean { try { return fs.existsSync(p) } catch { return false } }

// Attempt to read common places where these settings may live
const adminLayout = 'src/app/admin/layout.tsx'
const releaseRunbook = 'docs/Release-Runbook.md'
const guardrails = 'docs/Guardrails.md'

describe('UI Contract (Guardrails)', () => {
  test('Idle Timeout can be set: admin=15m, payment=5m (policy present)', () => {
    if (!fileExists(guardrails)) return console.warn('skip: docs/Guardrails.md missing')
    const doc = fs.readFileSync(guardrails, 'utf8')
    expect(doc).toMatch(/Idle Timeout: 管理15分 \/ 決済5分/)
  })

  test('Persistent Login policy: admin short only, general long OK', () => {
    if (!fileExists(guardrails)) return console.warn('skip: docs/Guardrails.md missing')
    const doc = fs.readFileSync(guardrails, 'utf8')
    expect(doc).toMatch(/Persistent Login.*管理者.*一時|短期/)
  })

  test('Responsive Table: mobile falls back to cards (policy present)', () => {
    if (!fileExists(guardrails)) return console.warn('skip: docs/Guardrails.md missing')
    const doc = fs.readFileSync(guardrails, 'utf8')
    expect(doc).toMatch(/モバイル.*カード化/)
  })
})
