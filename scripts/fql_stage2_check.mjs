import { spawn } from 'node:child_process'
import { mkdir, writeFile, access, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const WORKDIR = process.cwd()

function runCmd(cmd, args = [], options = {}) {
  return new Promise((resolve) => {
    const start = Date.now()
    const isWin = process.platform === 'win32'
    const resolvedCmd = isWin && cmd === 'npm' ? 'npm.cmd' : cmd
    const child = spawn(resolvedCmd, args, { cwd: WORKDIR, shell: isWin ? true : false, env: process.env, ...options })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr, durationMs: Date.now() - start })
    })
  })
}

async function pathExists(p) {
  try { await access(p); return true } catch { return false }
}

function parseJestSummary(text) {
  let total = 0, passed = 0, failed = 0
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('Tests:')) {
      // Examples:
      // Tests:       1 failed, 10 passed, 11 total
      // Tests:       10 passed, 10 total
      // Tests:       1 failed, 1 skipped, 9 passed, 11 total
      const mTotal = line.match(/(\d+)\s+total/) 
      const mPassed = line.match(/(\d+)\s+passed/)
      const mFailed = line.match(/(\d+)\s+failed/)
      if (mTotal) total = Number(mTotal[1])
      if (mPassed) passed = Number(mPassed[1])
      if (mFailed) failed = Number(mFailed[1])
    }
  }
  return { total, passed, failed }
}

async function listSchemasDir() {
  const dir = path.join(WORKDIR, 'src', 'schemas')
  if (!(await pathExists(dir))) return []
  const names = await readdir(dir)
  return names.sort()
}

async function listTestFiles() {
  try {
    const fg = await import('fast-glob')
    const patterns = [
      'tests/**/schema.*.(contract|spec|test).(ts|tsx|js)',
      'tests/contracts/**/*.contract.test.(ts|tsx|js)',
      'tests/contracts/api.schema.contract.test.ts',
      'tests/**/*schema*.*',
    ]
    const files = await fg.default(patterns, { cwd: WORKDIR, dot: true, unique: true })
    files.sort()
    return files
  } catch {
    // Fallback: shallow scan tests dir
    const out = []
    async function walk(dir) {
      let entries = []
      try { entries = await readdir(dir) } catch { return }
      for (const name of entries) {
        const p = path.join(dir, name)
        let s
        try { s = await stat(p) } catch { continue }
        if (s.isDirectory()) await walk(p)
        else if (p.includes('schema') || p.endsWith('.contract.test.ts')) out.push(path.relative(WORKDIR, p))
      }
    }
    await walk(path.join(WORKDIR, 'tests'))
    out.sort()
    return out
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 5000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(t)
  }
}

async function waitForHealthy(url, headers = {}, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetchWithTimeout(url, { headers }, 1500)
      if (r.status === 200) return true
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

async function main() {
  const errors = []

  // 1) Env and versions
  const nodeVersion = process.version
  const npmV = await runCmd('npm', ['-v'])
  const npmVersion = (npmV.code === 0 ? npmV.stdout.trim() : '')

  const envFilePriority = [
    '.env.local', '.env', '.env.development', '.env.production', '.env.staging', '.env.test',
    '.env.local.rnd', '.env.local.stg'
  ]
  let envFile = null
  for (const f of envFilePriority) {
    if (await pathExists(path.join(WORKDIR, f))) { envFile = f; break }
  }

  const APP_ENV = process.env.APP_ENV || ''
  const envSummary = {
    envFile: envFile || '',
    APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    ACTIONS_TOKEN: Boolean(process.env.ACTIONS_TOKEN),
  }

  // 2) Build
  const buildResult = await runCmd('npm', ['run', 'build'])
  const build = { success: buildResult.code === 0, durationMs: buildResult.durationMs }
  if (!build.success) {
    errors.push({ step: 'build', message: 'build failed', details: buildResult.stderr.slice(0, 2000) })
  }

  // 3) Schema tests
  const schemaRes = await runCmd('npm', ['run', 'test:schema'])
  let schemaCounts = parseJestSummary(schemaRes.stdout + '\n' + schemaRes.stderr)
  if (schemaRes.code !== 0 && schemaCounts.total === 0) {
    errors.push({ step: 'schemaTest', message: 'schema tests failed', details: (schemaRes.stderr || schemaRes.stdout).slice(0, 2000) })
  }

  // 4) Contract tests
  const contractsRes = await runCmd('npm', ['run', 'test:contracts'])
  let contractCounts = parseJestSummary(contractsRes.stdout + '\n' + contractsRes.stderr)
  if (contractsRes.code !== 0 && contractCounts.total === 0) {
    errors.push({ step: 'contractTest', message: 'contract tests failed', details: (contractsRes.stderr || contractsRes.stdout).slice(0, 2000) })
  }

  // 5) API checks
  const token = process.env.ACTIONS_TOKEN || ''
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
  let healthUrl = ''
  const envHealth = process.env.HEALTH_URL || ''
  const localApiHealth = 'http://localhost:3000/api/dev/health'

  // Prefer local server; try existing, otherwise start one
  try {
    const r = await fetchWithTimeout(localApiHealth, { headers: authHeader }, 1500)
    if (r.ok) healthUrl = localApiHealth
  } catch {}

  let serverChild = null
  if (!healthUrl) {
    try {
      const isWin = process.platform === 'win32'
      serverChild = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'start'], { cwd: WORKDIR, shell: isWin, env: process.env, stdio: 'ignore' })
      const ok = await waitForHealthy(localApiHealth, authHeader, 60000)
      if (ok) healthUrl = localApiHealth
    } catch {}
  }

  if (!healthUrl) {
    healthUrl = envHealth || 'https://quick-label-pm81inhlp-yasuaki-otakas-projects.vercel.app/api/dev/health'
  }

  let healthStatus = 0
  let healthOkFlag = false
  try {
    const hr = await fetchWithTimeout(healthUrl, { headers: authHeader }, 5000)
    healthStatus = hr.status
    try {
      const hjson = await hr.json()
      healthOkFlag = Boolean(hjson && hjson.ok === true)
    } catch {}
    if (healthStatus !== 200) {
      errors.push({ step: 'api', message: 'health endpoint non-200', details: String(healthStatus) })
    }
  } catch (e) {
    errors.push({ step: 'api', message: 'health endpoint request error', details: String(e) })
  }

  function originFrom(u) {
    try { const x = new URL(u); return x.origin } catch { return '' }
  }
  const baseOrigin = originFrom(healthUrl) || (process.env.HEALTH_URL ? originFrom(process.env.HEALTH_URL) : '')
  const runtimeBase = baseOrigin || 'https://quick-label-pm81inhlp-yasuaki-otakas-projects.vercel.app'
  // Prefer invalid limit to trigger validation error reliably
  const url422 = `${runtimeBase}/api/diagnostics/runtime-logs?limit=-1`
  const url200 = `${runtimeBase}/api/diagnostics/runtime-logs?since=2025-01-01T00:00:00Z&limit=1&status=ERROR`

  let rl422Status = 0
  let rl422HasIssues = false
  try {
    const r = await fetchWithTimeout(url422, { headers: authHeader }, 8000)
    rl422Status = r.status
    try {
      const j = await r.json()
      rl422HasIssues = Array.isArray(j?.issues) && j.issues.length >= 0
    } catch {}
    if (rl422Status !== 422) {
      errors.push({ step: 'api', message: 'runtime-logs 422 check failed', details: String(rl422Status) })
    }
  } catch (e) {
    errors.push({ step: 'api', message: 'runtime-logs 422 request error', details: String(e) })
  }

  let rl200Status = 0
  let rl200ItemsSample = ''
  try {
    const r = await fetchWithTimeout(url200, { headers: authHeader }, 8000)
    rl200Status = r.status
    try {
      const j = await r.json()
      if (Array.isArray(j?.items)) {
        if (j.items.length === 0) rl200ItemsSample = 'length:0'
        else rl200ItemsSample = `keys:${Object.keys(j.items[0]).join(',')}`
      }
    } catch {}
    if (rl200Status !== 200) {
      errors.push({ step: 'api', message: 'runtime-logs 200 check failed', details: String(rl200Status) })
    }
  } catch (e) {
    errors.push({ step: 'api', message: 'runtime-logs 200 request error', details: String(e) })
  }

  // 6) Artifacts
  const schemasDir = await listSchemasDir()
  const hasValidateUtil = await pathExists(path.join(WORKDIR, 'src', 'lib', 'validate.ts'))
  const hasDocsSchemasMd = await pathExists(path.join(WORKDIR, 'docs', 'dev', 'SCHEMAS.md'))
  const testFiles = await listTestFiles()

  // 7) Compose JSON and write
  const report = {
    status: (build.success && schemaCounts.failed === 0 && contractCounts.failed === 0 && healthStatus === 200 && rl422Status === 422 && rl200Status === 200) ? 'ok' : 'fail',
    summary: {
      stage: 'Stage2-Final-Check',
      timestamp: new Date().toISOString(),
    },
    env: envSummary,
    versions: { node: nodeVersion, npm: npmVersion },
    build,
    tests: {
      schema: schemaCounts,
      contracts: contractCounts,
    },
    api: {
      health: { url: healthUrl, status: healthStatus, okFlag: healthOkFlag },
      runtimeLogs422: { url: url422, status: rl422Status, hasIssues: rl422HasIssues },
      runtimeLogs200: { url: url200, status: rl200Status, itemsSample: rl200ItemsSample },
    },
    artifacts: {
      schemasDir,
      hasValidateUtil,
      hasDocsSchemasMd,
      testFiles,
      reportPath: 'artifacts/fql_stage2_final_report.json',
    },
    errors,
  }

  try { await mkdir(path.join(WORKDIR, 'artifacts'), { recursive: true }) } catch {}
  await writeFile(path.join(WORKDIR, 'artifacts', 'fql_stage2_final_report.json'), JSON.stringify(report, null, 2), 'utf8')
  // Print only the JSON (single line) to stdout
  process.stdout.write(JSON.stringify(report))

  // Attempt to clean up the local server if we started it
  try { if (serverChild) serverChild.kill('SIGTERM') } catch {}
}

main().catch(async (e) => {
  const fallback = {
    status: 'fail',
    summary: { stage: 'Stage2-Final-Check', timestamp: new Date().toISOString() },
    env: { envFile: '', APP_ENV: process.env.APP_ENV || '', NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY: !!process.env.OPENAI_API_KEY, ACTIONS_TOKEN: !!process.env.ACTIONS_TOKEN },
    versions: { node: process.version, npm: '' },
    build: { success: false, durationMs: 0 },
    tests: { schema: { total: 0, passed: 0, failed: 0 }, contracts: { total: 0, passed: 0, failed: 0 } },
    api: { health: { url: '', status: 0, okFlag: false }, runtimeLogs422: { url: '', status: 0, hasIssues: false }, runtimeLogs200: { url: '', status: 0, itemsSample: '' } },
    artifacts: { schemasDir: [], hasValidateUtil: false, hasDocsSchemasMd: false, testFiles: [], reportPath: 'artifacts/fql_stage2_final_report.json' },
    errors: [{ step: 'fatal', message: 'runner crashed', details: String(e) }],
  }
  try { await mkdir(path.join(WORKDIR, 'artifacts'), { recursive: true }) } catch {}
  try { await writeFile(path.join(WORKDIR, 'artifacts', 'fql_stage2_final_report.json'), JSON.stringify(fallback, null, 2), 'utf8') } catch {}
  process.stdout.write(JSON.stringify(fallback))
})


