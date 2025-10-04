export function getPublicQuotesOrgId(): string | null {
  const v = process.env.PUBLIC_QUOTES_ORG_ID?.trim()
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null
}


