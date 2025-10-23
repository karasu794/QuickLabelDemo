import { describe, it, expect } from 'vitest'
import { maskPII } from '@/lib/observability/logger'

describe('maskPII', () => {
  it('redacts 10–16 digit sequences', () => {
    const src = { c1: '4111111111111111', note: 'abc 1234567890 xyz', keep: 'abc-1234-xyz' }
    const out = maskPII(src)
    expect(out.c1).toBe('<redacted>')
    expect(String(out.note)).toContain('<redacted>')
    expect(out.keep).toBe('abc-1234-xyz')
  })
})


