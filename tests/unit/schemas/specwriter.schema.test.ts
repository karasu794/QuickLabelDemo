import { SpecWriterSchema } from '@/schemas/specwriter.schema'
import { validateOrThrow, isValid } from '@/lib/validate'

describe('SpecWriterSchema', () => {
  test('valid', () => {
    const ok = {
      files: [{ path: 'src/app/index.ts', content: 'x' }],
      diffs: [{ path: 'docs/CHANGELOG.md', code: '...' }],
      tests: [{ type: 'unit', path: 'tests/unit/a.test.ts', content: 't' }],
      manualQA: [{ description: 'open app' }],
    }
    const v = validateOrThrow(SpecWriterSchema, ok)
    expect(v.files.length).toBe(1)
    expect(isValid(SpecWriterSchema, ok)).toBe(true)
  })

  test('invalid path', () => {
    const bad = { files: [{ path: 'bin/hack.sh', content: 'x' }] }
    expect(() => validateOrThrow(SpecWriterSchema, bad)).toThrow()
  })
})


