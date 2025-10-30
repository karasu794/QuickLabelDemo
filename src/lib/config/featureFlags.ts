export function isReviewDisclaimerEnabled(): boolean {
  const v = (process.env.FEATURE_REVIEW_DISCLAIMER ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}

export function isServiceStepEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_ENABLE_SERVICE_STEP ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}

export function isPhoenixDiscountEnabled(): boolean {
  const v = (process.env.FEATURE_PHOENIX_DISCOUNT ?? 'false').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}


