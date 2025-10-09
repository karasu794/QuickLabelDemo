export type CancelAction = 'void' | 'refund'

export type CancelResult =
  | { ok: true; action: CancelAction; externalId?: string }
  | { ok: false; code: 'EXTERNAL_ERROR' | 'NOT_ALLOWED' | 'NOT_FOUND' | 'RATE_LIMIT'; reason: string }

export interface ISquarePaymentsAdapter {
  void(paymentId: string, opts?: { idempotencyKey?: string }): Promise<CancelResult>
  refund(
    paymentId: string,
    opts?: { amount: number; currency: string; idempotencyKey?: string },
  ): Promise<CancelResult>
}

/**
 * Mock adapter with deterministic behavior controllable via static maps.
 */
export class MockSquarePaymentsAdapter implements ISquarePaymentsAdapter {
  static voidResponses = new Map<string, CancelResult>()
  static refundResponses = new Map<string, CancelResult>()

  async void(paymentId: string, opts?: { idempotencyKey?: string }): Promise<CancelResult> {
    const key = `${paymentId}:${opts?.idempotencyKey || ''}`
    return MockSquarePaymentsAdapter.voidResponses.get(key) || { ok: true, action: 'void' }
  }

  async refund(
    paymentId: string,
    opts?: { amount: number; currency: string; idempotencyKey?: string },
  ): Promise<CancelResult> {
    const key = `${paymentId}:${opts?.idempotencyKey || ''}:${opts?.amount || ''}:${opts?.currency || ''}`
    return MockSquarePaymentsAdapter.refundResponses.get(key) || { ok: true, action: 'refund' }
  }
}


