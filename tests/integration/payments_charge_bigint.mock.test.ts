import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('square', () => ({
  SquareClient: class {
    payments = { create: vi.fn(async (arg: any) => ({ payment: { id: 'pid_1', status: 'COMPLETED' }, arg })) }
  }
}))

import { normalizeJPYAmount } from '@/lib/vendors/square/amount'

describe('payments charge uses BigInt for SDK', () => {
  beforeEach(() => {
    process.env.SQUARE_ACCESS_TOKEN = 'x'
    process.env.NODE_ENV = 'test'
  })
  it('converts number -> BigInt just for SDK', async () => {
    const { amountInt, amountBig } = normalizeJPYAmount(5558)
    expect(amountInt).toBe(5558)
    expect(typeof amountBig).toBe('bigint')
  })
})


