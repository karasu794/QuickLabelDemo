export function getCommitSha7(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.COMMIT_SHA || ''
  const v = typeof sha === 'string' && sha.length >= 7 ? sha.slice(0,7) : null
  return v
}

export function getEnvName(): 'staging' | 'production' | 'development' {
  const ve = process.env.VERCEL_ENV
  if (ve === 'production') return 'production'
  if (ve === 'preview') return 'staging'
  if (process.env.NODE_ENV === 'production') return 'staging'
  return 'development'
}


