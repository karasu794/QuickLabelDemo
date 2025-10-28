import { describe, it, expect } from 'vitest'
import { evaluateSuccessGate } from '@/lib/successGate'

describe('success gate', () => {
  it('pass when payment completed + tracking + label', () => {
    const r = evaluateSuccessGate({ paymentStatus: 'completed', trackingNumber: 'TN', labelBlobUrl: 'u' })
    expect(r.pass).toBe(true)
    expect(r.reasons).toEqual([])
  })
  it('fails with three reasons', () => {
    const r = evaluateSuccessGate({ paymentStatus: 'pending', trackingNumber: null, labelBlobUrl: null })
    expect(r.pass).toBe(false)
    expect(r.reasons).toEqual(['payment_not_completed','tracking_missing','label_not_ready'])
  })
})


