// CORE_MODE: E2E/Playwright 用ユーティリティ
export function isCoreMode(): boolean {
  return String(process.env.CORE_MODE || '').toLowerCase().trim() === 'true'
}


