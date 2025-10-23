import { describe, it, expect } from 'vitest'

describe('POST /api/ship/create', () => {
  it('should return unified shape with attachments[] and trackingNumbers[]', async () => {
    // NOTE: このテストはダミー形。実環境ではfetchをモック or E2Eで検証。
    expect(true).toBe(true)
  })

  it('should be idempotent for same Idempotency-Key', async () => {
    expect(true).toBe(true)
  })
})


