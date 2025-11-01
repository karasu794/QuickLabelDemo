import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

describe('square openapi spec', () => {
  it('exists and contains payments endpoint', () => {
    const json = JSON.parse(fs.readFileSync('docs/vendors/square/openapi.json','utf8'))
    const paths = Object.keys(json.paths || {})
    expect(paths.some(p => /\/v2\/payments/.test(p))).toBe(true)
  })
})


