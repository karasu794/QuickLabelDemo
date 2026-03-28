/**
 * FQL デモ環境 プリフライトチェック
 *
 * デプロイ前に実行して、デモ環境の安全性を確認する。
 * 実行: npx tsx scripts/demo-preflight.ts
 */
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

let ok = true
function check(label: string, pass: boolean, detail?: string) {
  const icon = pass ? '✅' : '❌'
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!pass) ok = false
}

console.log('\n========== FQL デモ プリフライトチェック ==========\n')

// 1. APP_ENV=demo
check('APP_ENV=demo', process.env.APP_ENV === 'demo', process.env.APP_ENV)
check('NEXT_PUBLIC_APP_ENV=demo', process.env.NEXT_PUBLIC_APP_ENV === 'demo', process.env.NEXT_PUBLIC_APP_ENV)

// 2. FedEx sandbox
check('FEDEX_ENV=sandbox', process.env.FEDEX_ENV === 'sandbox', process.env.FEDEX_ENV)
check('FedEx API URL is sandbox', process.env.FEDEX_API_BASE_URL?.includes('sandbox') ?? false, process.env.FEDEX_API_BASE_URL)

// 3. Square sandbox
check('SQUARE_ENV=sandbox', process.env.SQUARE_ENV === 'sandbox', process.env.SQUARE_ENV)

// 4. SHIP_API_WRITE_ENABLED=false
check('SHIP_API_WRITE_ENABLED=false', process.env.SHIP_API_WRITE_ENABLED !== 'true', process.env.SHIP_API_WRITE_ENABLED)

// 5. デモログイン情報が設定されている
check('NEXT_PUBLIC_DEMO_USER_EMAIL set', !!process.env.NEXT_PUBLIC_DEMO_USER_EMAIL)
check('NEXT_PUBLIC_DEMO_ADMIN_EMAIL set', !!process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL)

// 6. 本番個人情報が残っていないか
const envContent = fs.readFileSync('.env.local', 'utf-8')
const piiPatterns = [
  { pattern: /k-jee@hotmail\.co\.jp/i, label: '実メールアドレス (k-jee)' },
  { pattern: /kuroneko1192/i, label: '実パスワード' },
  { pattern: /github_pat_/i, label: 'GitHub PAT' },
  { pattern: /sk-proj-/i, label: 'OpenAI API Key' },
  { pattern: /key_f0a835/i, label: 'Cursor API Key' },
]
for (const { pattern, label } of piiPatterns) {
  check(`PII除去: ${label}`, !pattern.test(envContent))
}

// 7. .gitignore に .env.local が含まれている
const gitignore = fs.readFileSync('.gitignore', 'utf-8')
check('.gitignore に .env*.local', /\.env\*\.local|\.env\.local/.test(gitignore))

// 8. Supabase接続情報
check('SUPABASE_URL set', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
check('SUPABASE_ANON_KEY set', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// 9. SIMULATE_PAYMENT=true
check('SIMULATE_PAYMENT=true', process.env.SIMULATE_PAYMENT === 'true', process.env.SIMULATE_PAYMENT)

console.log('\n' + (ok ? '🎉 全チェック通過。デプロイ準備OK。' : '⚠️ 一部チェックに失敗。上記を確認してください。'))
console.log('')

process.exit(ok ? 0 : 1)
