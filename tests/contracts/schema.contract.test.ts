import { isValid, validateOrThrow } from '@lib/validate'
import { SpecWriterSchema } from '@schemas/specwriter.schema'
import { LogDoctorSchema } from '@schemas/logdoctor.schema'

describe('Schema Contracts', () => {
  test('SpecWriter valid sample passes', () => {
    const sample = {
      files: [{ path: 'src/a.ts', content: 'x' }],
      diffs: [{ path: 'docs/a.md', code: '...' }],
      tests: [{ type: 'unit', path: 'tests/unit/a.test.ts', content: 't' }],
      manualQA: [{ description: 'do X' }],
    }
    expect(isValid(SpecWriterSchema, sample)).toBe(true)
    expect(() => validateOrThrow(SpecWriterSchema, sample)).not.toThrow()
  })

  test('SpecWriter invalid path fails', () => {
    const bad = { files: [{ path: 'bin/x', content: 'x' }] }
    expect(isValid(SpecWriterSchema, bad)).toBe(false)
    expect(() => validateOrThrow(SpecWriterSchema, bad)).toThrow()
  })

  test('LogDoctor valid sample passes', () => {
    const sample = {
      summary: 'ok',
      rootCauses: [{ code: 'E1', category: 'App', description: 'bug' }],
      evidence: [{ type: 'log', source: 'api', snippet: '...' }],
      fixDiffs: [{ path: 'src/a.ts', code: 'diff' }],
      retest: { steps: ['run'] },
    }
    expect(isValid(LogDoctorSchema, sample)).toBe(true)
  })

  test('LogDoctor missing retest fails', () => {
    const bad = { summary: 'x' }
    expect(isValid(LogDoctorSchema, bad as any)).toBe(false)
    expect(() => validateOrThrow(LogDoctorSchema, bad as any)).toThrow()
  })
})


