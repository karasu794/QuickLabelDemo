import * as fs from 'fs'
import * as path from 'path'
import { isAdmin } from '@/lib/auth/isAdmin'

describe('Auth Contract (Guardrails)', () => {
  test('middleware.ts: protects /admin/* and bypasses /api/*', () => {
    const mw = path.join(process.cwd(), 'middleware.ts')
    const code = fs.readFileSync(mw, 'utf8')
    // /admin マッチャーがあること
    expect(code).toMatch(/matcher:\s*\[\s*['"]\/admin\/:path\*['"]\s*\]/)
    // /api をマッチャーに含まないこと
    expect(code).not.toMatch(/\/api\//)
  })
})

describe('isAdmin()', () => {
  test('role=admin is admin', () => {
    expect(isAdmin({ role: 'admin', is_admin: false })).toBe(true)
  })
  test('is_admin=true is admin', () => {
    expect(isAdmin({ role: null, is_admin: true })).toBe(true)
  })
  test('neither is non admin', () => {
    expect(isAdmin({ role: 'user', is_admin: false })).toBe(false)
  })
})
