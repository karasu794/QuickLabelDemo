export function isReviewDisclaimerEnabled(): boolean {
  const v = (process.env.FEATURE_REVIEW_DISCLAIMER ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}


export function isReviewRatesDisabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}

export function isReviewRateUiHidden(): boolean {
  const v = (process.env.NEXT_PUBLIC_HIDE_REVIEW_RATE_UI ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}

export function isServiceStepEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_ENABLE_SERVICE_STEP ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}


