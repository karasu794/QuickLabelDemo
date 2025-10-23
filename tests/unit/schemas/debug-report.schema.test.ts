import { DebugReportSchema } from '@/schemas/debug-report.schema'
import { validateOrThrow } from '@/lib/validate'

describe('DebugReportSchema', () => {
  test('valid', () => {
    const ok = {
      id: '1', jobId: 'j1', summary: 's', status: 'error', fixDiffs: ['d'], createdAt: new Date().toISOString()
    }
    const v = validateOrThrow(DebugReportSchema, ok)
    expect(v.status).toBe('error')
  })

  test('invalid status', () => {
    const bad = { id: '1', jobId: 'j1', summary: 's', status: 'bad', fixDiffs: [], createdAt: new Date().toISOString() }
    // @ts-expect-error
    expect(() => validateOrThrow(DebugReportSchema, bad)).toThrow()
  })
})


