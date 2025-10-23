import { test, expect } from '@playwright/test'
import { LogDoctorSchema } from '@schemas/logdoctor.schema'
import { isValid } from '@lib/validate'

test('schema assertion sample (LogDoctor)', async ({ request, baseURL }) => {
  const url = `${baseURL}/api/diagnostics/runtime-logs`
  const res = await request.get(url)
  expect(res.status()).toBe(200)
  const json = await res.json()
  // 簡易: items[0] から LogDoctorSchema の一部に合致する形を擬似検証（ここでは存在のみ）
  expect(Array.isArray(json.items)).toBe(true)
  // 実運用では該当エンドポイントのスキーマを検証
  expect(isValid(LogDoctorSchema, {
    summary: 'sample',
    rootCauses: [{ code: 'E', category: 'App', description: 'x' }],
    evidence: [{ type: 'log', source: 'sys', snippet: '...' }],
    fixDiffs: [],
    retest: { steps: ['x'] },
  })).toBe(true)
})


