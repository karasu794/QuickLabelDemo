#!/usr/bin/env node
/* eslint-disable no-console */
const fg = require('fast-glob');
const fs = require('fs');
const path = require('path');
const colors = require('picocolors');
const madge = require('madge');

// -------- config --------
const SRC_DIR = 'src';
const HIGH_MAX = 0; // High が 1件でもあれば fail
const LARGE_FILE_LINES = 500;
const UI_DIR = path.join(SRC_DIR, 'app');
const SERVER_DIR = path.join(SRC_DIR, 'lib', 'server');
const REPOS_DIR = path.join(SERVER_DIR, 'repos');

// -------- helpers --------
function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}
function list(patterns) {
  return fg.sync(patterns, { dot: false, onlyFiles: true });
}
function rel(p) { return p.split(path.sep).join('/'); }

// -------- checks --------
async function checkCircularDeps() {
  try {
    const res = await madge(SRC_DIR, {
      fileExtensions: ['ts', 'tsx'],
      tsConfig: fs.existsSync('tsconfig.json') ? 'tsconfig.json' : undefined,
      includeNpm: false,
    });
    const cycles = res.circular();
    return cycles.map(cycle => ({ files: cycle }));
  } catch (e) {
    return [{ error: 'madge failed: ' + (e && e.message ? e.message : String(e)) }];
  }
}

function checkDirectSupabase() {
  const files = list([`${SRC_DIR}/**/*.{ts,tsx}`]);
  const hits = [];
  for (const f of files) {
    const rp = rel(f);
    const code = read(f);
    const isRepo = rp.startsWith(`${REPOS_DIR}/`);
    const isRoute = /\/route\.ts$/.test(rp); // API route
    const usesSupabaseFrom = /supabase\.from\s*\(/.test(code);
    const importsSupabase = /from\s+['"]@?supabase\/.+['"]/.test(code);

    // repo 以外 & route 以外で supabase.from を叩く → High
    if (!isRepo && !isRoute && usesSupabaseFrom) {
      hits.push({ file: rp, reason: 'direct supabase.from() outside repo/route' });
      continue;
    }
    // route.ts で supabase 直接 import → High（repo経由に誘導）
    if (isRoute && importsSupabase) {
      hits.push({ file: rp, reason: 'route.ts imports supabase directly' });
    }
  }
  return hits;
}

function checkUiImportsServer() {
  // /src/app/**（ただし /api/** を除く）で /src/lib/server/** を import → High
  const files = list([`${UI_DIR}/**/*.{ts,tsx}`]).filter(f => !/\/api\//.test(rel(f)));
  const hits = [];
  for (const f of files) {
    const rp = rel(f);
    const code = read(f);
    const importServer = /from\s+['"](?:\.{1,2}\/)*src\/lib\/server\//.test(code) ||
                         /from\s+['"](?:\.{1,2}\/)+lib\/server\//.test(code);
    if (importServer) {
      hits.push({ file: rp, reason: 'UI imports server code directly (layer violation)' });
    }
  }
  return hits;
}

function checkLargeFiles() {
  const files = list([`${SRC_DIR}/**/*.{ts,tsx}`]);
  const hits = [];
  for (const f of files) {
    const rp = rel(f);
    const lines = read(f).split(/\r?\n/).length;
    if (lines > LARGE_FILE_LINES) {
      hits.push({ file: rp, lines });
    }
  }
  return hits;
}

function checkUnusedServerExports() {
  // 雑に "export " を含むが、"import {something} from '<file>'" が0件なら未使用疑い
  const serverFiles = list([`${REPOS_DIR}/**/*.ts`]);
  const allFiles = list([`${SRC_DIR}/**/*.{ts,tsx}`]);
  const importsIndex = {};
  for (const f of allFiles) {
    const code = read(f);
    for (const m of code.matchAll(/from\s+['"](.+?)['"]/g)) {
      const target = m[1];
      importsIndex[target] = (importsIndex[target] || 0) + 1;
    }
  }
  const hits = [];
  for (const f of serverFiles) {
    const rp = rel(f);
    const code = read(f);
    if (!/export\s/.test(code)) continue;
    // 相対 import 解決の簡易版（.ts 末尾なし/ありの両対応）
    const baseNoExt = rp.replace(/\.ts$/, '');
    const candidates = [baseNoExt, `./${path.basename(baseNoExt)}`, rp];
    const imported = candidates.some(c => importsIndex[c]);
    if (!imported) hits.push({ file: rp, reason: 'no imports found (suspected unused export)' });
  }
  return hits;
}

function checkFixmeTodos() {
  const files = list([`${SRC_DIR}/**/*.{ts,tsx}`]);
  const hits = [];
  for (const f of files) {
    const rp = rel(f);
    const code = read(f);
    const count = (code.match(/FIXME|TODO/g) || []).length;
    if (count > 0) hits.push({ file: rp, count });
  }
  return hits;
}

// -------- report --------
(async function run() {
  const high = [];
  const med = [];
  const low = [];

  // High
  const cycles = await checkCircularDeps();
  for (const c of cycles) {
    if (c.error) high.push({ type: 'circular:error', detail: c.error });
    else high.push({ type: 'circular', files: c.files });
  }
  for (const h of checkDirectSupabase()) high.push({ type: 'direct-supabase', ...h });
  for (const h of checkUiImportsServer()) high.push({ type: 'layer-violation', ...h });

  // Medium
  for (const m of checkLargeFiles()) med.push({ type: 'large-file', ...m });
  for (const m of checkUnusedServerExports()) med.push({ type: 'unused-export', ...m });

  // Low
  for (const l of checkFixmeTodos()) low.push({ type: 'todo-fixme', ...l });

  // Print
  function section(title, arr, color) {
    console.log(color(`\n[${title}] (${arr.length})`));
    if (!arr.length) { console.log(color('  - none')); return; }
    for (const item of arr) {
      if (item.type === 'circular') {
        console.log('  - cycle:', item.files.join(' -> '));
      } else if (item.type === 'circular:error') {
        console.log('  - madge error:', item.detail);
      } else {
        console.log('  -', JSON.stringify(item));
      }
    }
  }

  console.log(colors.bold('Weekly Drift Report'));
  section('High', high, colors.red);
  section('Medium', med, colors.yellow);
  section('Low', low, colors.gray);

  // Exit policy
  if (high.length > HIGH_MAX) {
    console.error(colors.red(`\n❌ Found ${high.length} HIGH issues. Please fix before merge.`));
    process.exit(1);
  } else {
    console.log(colors.green('\n✅ No blocking HIGH issues.'));
    process.exit(0);
  }
})();
