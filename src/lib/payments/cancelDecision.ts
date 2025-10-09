import { PaymentRecord } from './types'

export type Decision =
  | { type: 'void' }
  | { type: 'refund'; amount: number; currency: string }
  | { type: 'reject'; code: 409 | 422; reason: string }

export function decideCancel(payment: PaymentRecord): Decision {
  const amount = payment.amount
  const currency = payment.currency
  switch (payment.status) {
    case 'authorized':
      return { type: 'void' }
    case 'captured':
    case 'settled': {
      const remaining = amount - (payment.refundedAmount || 0)
      if (remaining <= 0) return { type: 'reject', code: 409, reason: 'Already fully refunded' }
      return { type: 'refund', amount: remaining, currency }
    }
    case 'partially_refunded': {
      const remaining = amount - (payment.refundedAmount || 0)
      if (remaining <= 0) return { type: 'reject', code: 409, reason: 'No remaining amount' }
      return { type: 'refund', amount: remaining, currency }
    }
    case 'voided':
      return { type: 'reject', code: 409, reason: 'Already voided' }
    case 'refunded':
      return { type: 'reject', code: 409, reason: 'Already refunded' }
    case 'expired':
    case 'failed':
      return { type: 'reject', code: 422, reason: 'Payment not cancellable' }
    default:
      return { type: 'reject', code: 422, reason: 'Unknown status' }
  }
}


