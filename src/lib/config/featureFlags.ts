export function isReviewDisclaimerEnabled(): boolean {
  const v = (process.env.FEATURE_REVIEW_DISCLAIMER ?? 'true').toLowerCase()
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}


