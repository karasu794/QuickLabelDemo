import { LogDoctorSchema } from '@/schemas/logdoctor.schema'
import { validateOrThrow } from '@/lib/validate'

describe('LogDoctorSchema', () => {
  test('valid', () => {
    const ok = {
      summary: 'root cause found',
      rootCauses: [{ code: 'E1', category: 'App', description: 'bug' }],
      evidence: [{ type: 'log', source: 'api', snippet: 'ERR' }],
      fixDiffs: [{ path: 'src/a.ts', code: 'diff' }],
      retest: { steps: ['re-run'] },
    }
    const v = validateOrThrow(LogDoctorSchema, ok)
    expect(v.summary).toBeTruthy()
  })

  test('invalid missing retest', () => {
    const bad = { summary: 'x' }
    expect(() => validateOrThrow(LogDoctorSchema, bad)).toThrow()
  })
})


