import { describe, it, expect } from 'vitest'
import { normalizeJPYAmount } from '@/lib/vendors/square/amount'

describe('normalizeJPYAmount', () => {
  it('rounds and returns bigint for SDK, number for app', () => {
    const { amountInt, amountBig } = normalizeJPYAmount(5558.2)
    expect(amountInt).toBe(5558)
    expect(typeof amountBig).toBe('bigint')
  })
  it('rejects non-positive', () => {
    expect(() => normalizeJPYAmount(0)).toThrow()
    expect(() => normalizeJPYAmount(-1)).toThrow()
  })
  it('accepts numeric-like strings', () => {
    const { amountInt } = normalizeJPYAmount('1000')
    expect(amountInt).toBe(1000)
  })
})


