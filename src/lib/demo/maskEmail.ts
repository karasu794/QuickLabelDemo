/**
 * デモ環境用: メールアドレスをマスクする
 * 例: "user@example.com" → "us***@example.com"
 * APP_ENV=demo の場合のみマスク、それ以外はそのまま返す
 */
const IS_DEMO = process.env.APP_ENV === 'demo'

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null
  if (!IS_DEMO) return email
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}
