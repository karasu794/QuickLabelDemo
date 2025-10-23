import { describe, it, expect } from '@jest/globals'

function shouldUseDirectRates(rates: any[] | null | undefined): boolean {
  return Array.isArray(rates) && rates.length > 0
}

describe('Review page quote display strategy', () => {
  it('uses direct rates when they exist', () => {
    const direct = [{ serviceType: 'INTERNATIONAL_PRIORITY', totalNetFedExCharge: '1000' }]
    expect(shouldUseDirectRates(direct)).toBe(true)
  })

  it('does not use direct rates when empty', () => {
    const direct: any[] = []
    expect(shouldUseDirectRates(direct)).toBe(false)
  })

  it('does not use direct rates when null/undefined', () => {
    expect(shouldUseDirectRates(null as any)).toBe(false)
    expect(shouldUseDirectRates(undefined as any)).toBe(false)
  })
})


