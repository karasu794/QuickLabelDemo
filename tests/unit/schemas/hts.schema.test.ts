import { HTSInputSchema, HTSOutputSchema } from '@/schemas/hts.schema'
import { validateOrThrow } from '@/lib/validate'

describe('HTS schemas', () => {
  test('input valid', () => {
    const v = validateOrThrow(HTSInputSchema, { weightKg: 1.2, originCountry: 'JP' })
    expect(v.weightKg).toBeGreaterThan(0)
  })

  test('output invalid', () => {
    const bad = [{ code: '', label: 'x', confidence: 1.1, evidenceUrls: [] }]
    expect(() => validateOrThrow(HTSOutputSchema, bad)).toThrow()
  })
})


