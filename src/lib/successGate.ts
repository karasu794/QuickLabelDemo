export type SuccessGateInput = {
  paymentStatus?: string | null
  trackingNumber?: string | null
  labelBlobUrl?: string | null
}

export type SuccessGateResult = { pass: boolean; reasons: string[] }

export function evaluateSuccessGate(x: SuccessGateInput): SuccessGateResult {
  const reasons: string[] = []
  if (x.paymentStatus !== 'completed') reasons.push('payment_not_completed')
  if (!x.trackingNumber) reasons.push('tracking_missing')
  if (!x.labelBlobUrl) reasons.push('label_not_ready')
  return { pass: reasons.length === 0, reasons }
}


