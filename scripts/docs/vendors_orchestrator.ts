import { execSync } from 'node:child_process'

// usage: pnpm tsx scripts/docs/vendors_orchestrator.ts <sync|build|all>
// 既存の vendor 専用スクリプト（docs:square:* / docs:fedex:*）を順に呼び出す。
// 無い場合はスキップ（非エラー）。

const mode = (process.argv[2] || 'all').toLowerCase()
const VENDORS = (process.env.VENDORS || 'square,fedex').split(',').map(v=>v.trim()).filter(Boolean)

const cmdMap: Record<string, Record<string, string>> = {
  square: {
    sync: 'pnpm -s docs:square:sync',
    build: 'pnpm -s docs:square:build',
    all: 'pnpm -s docs:square:all'
  },
  fedex: {
    // 既に用意済みの FedEx 側スクリプトがある前提（無ければスキップ）。
    sync: 'pnpm -s docs:fedex:sync',
    build: 'pnpm -s docs:fedex:build',
    all: 'pnpm -s docs:fedex:all'
  }
}

function tryRun(cmd: string) {
  try {
    execSync(cmd, { stdio: 'inherit' })
    return true
  } catch (e) {
    // "Missing script" 等はスキップ扱いにする
    const msg = String(e instanceof Error ? e.message : e)
    if (/Missing script|Unknown command|ERR_PNPM_NO_SCRIPT/.test(msg)) {
      console.warn(`[vendors] skip: ${cmd} (no script)`)
      return false
    }
    throw e
  }
}

(function main() {
  if (!['sync','build','all'].includes(mode)) {
    console.error('usage: vendors_orchestrator <sync|build|all>')
    process.exit(1)
  }
  let ranAny = false
  for (const v of VENDORS) {
    const m = cmdMap[v]
    if (!m) { console.warn(`[vendors] unknown vendor: ${v}`); continue }
    const cmd = m[mode]
    console.log(`\n[vendors] ${v} → ${mode}`)
    const ok = tryRun(cmd)
    ranAny = ranAny || ok
  }
  if (!ranAny) {
    console.warn('[vendors] nothing executed (all missing). This is not an error.')
  }
})()


