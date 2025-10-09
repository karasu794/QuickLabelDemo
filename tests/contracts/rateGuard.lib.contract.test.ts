/* global jest */
import * as RG from '../../src/lib/ship/rateGuard'

describe('RateGuard lib contract', () => {
  test('ENV new names precedence; old names fallback', () => {
    const cfg = RG.loadRGConfig({
      REQUIRE_RATE_MATCH: 'true',
      RATE_GUARD_MAX_PCT: '0.01',
      RATE_GUARD_MAX_ABS: '300',
      RATE_MATCH_PERCENT_TOLERANCE: '0.5',
      RATE_MATCH_YEN_TOLERANCE: '9999',
    } as any)
    expect(cfg.require).toBe(true)
    expect(cfg.maxPct).toBe(0.01)
    expect(cfg.maxAbs).toBe(300)
  })

  test('OK inside thresholds', () => {
    const cfg = RG.loadRGConfig({ REQUIRE_RATE_MATCH: 'true', RATE_GUARD_MAX_PCT: '0.02', RATE_GUARD_MAX_ABS: '300' } as any)
    const res = RG.assertRateConsistency(10000, 10100, cfg)
    expect(res.ok).toBe(true)
    expect(res.warnings).toBeUndefined()
  })

  test('Boundary just under', () => {
    const cfg = RG.loadRGConfig({ REQUIRE_RATE_MATCH: 'true', RATE_GUARD_MAX_PCT: '0.01', RATE_GUARD_MAX_ABS: '300' } as any)
    const res = RG.assertRateConsistency(10000, 10099, cfg)
    expect(res.ok).toBe(true)
  })

  test('Exceed throws when require=true', () => {
    const cfg = RG.loadRGConfig({ REQUIRE_RATE_MATCH: 'true', RATE_GUARD_MAX_PCT: '0.01', RATE_GUARD_MAX_ABS: '50' } as any)
    expect(() => RG.assertRateConsistency(10000, 10100, cfg)).toThrow()
  })

  test('Exceed but require=false -> warnings', () => {
    const cfg = RG.loadRGConfig({ REQUIRE_RATE_MATCH: 'false', RATE_GUARD_MAX_PCT: '0.01', RATE_GUARD_MAX_ABS: '50' } as any)
    const res = RG.assertRateConsistency(10000, 10100, cfg)
    expect(res.ok).toBe(true)
    expect(res.warnings?.[0]).toContain('rate_guard:exceeded')
  })

  test('No reference with require=false -> passes with warning', () => {
    const cfg = RG.loadRGConfig({ REQUIRE_RATE_MATCH: 'false', RATE_GUARD_MAX_PCT: '0.01', RATE_GUARD_MAX_ABS: '50' } as any)
    const res = RG.assertRateConsistency(null, 10000, cfg)
    expect(res.ok).toBe(true)
    expect(res.warnings?.[0]).toContain('no_reference')
  })
})


