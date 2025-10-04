#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');

const MODE = (process.env.FLAG_DEADLINE_MODE || 'strict').toLowerCase(); // 'strict' | 'warn'
const isWarn = MODE === 'warn';

// 今日(UTC)の 00:00
const now = new Date();
const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

function parseTable(md) {
  // "一覧"テーブルの最初の表を抽出（| で始まる行の塊）
  const lines = md.split(/\r?\n/);
  const tableBlocks = [];
  let cur = [];
  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      cur.push(line.trim());
    } else {
      if (cur.length) {
        tableBlocks.push(cur);
        cur = [];
      }
    }
  }
  if (cur.length) tableBlocks.push(cur);
  if (!tableBlocks.length) return [];

  // 一番列幅の多いブロックを採用
  const tbl = tableBlocks.sort((a, b) => b.length - a.length)[0];
  if (tbl.length < 2) return [];

  // 1行目: ヘッダ, 2行目: セパレータ, 以降: データ
  const header = tbl[0].split('|').map(s => s.trim()).filter(Boolean);
  const body = tbl.slice(2).map(row => row.split('|').map(s => s.trim()).filter(Boolean));

  // ヘッダのインデックス解決
  const idx = (name) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const colFlag = idx('Flag');
  const colType = idx('Type');
  const colCreated = idx('Created');
  const colStatus = idx('Status');
  const colCleanup = idx('Cleanup');
  const colScope = idx('Scope');

  const out = [];
  for (const cells of body) {
    if (!cells.length) continue;
    const rec = {
      Flag: cells[colFlag] ?? '',
      Type: cells[colType] ?? '',
      Created: cells[colCreated] ?? '',
      Status: cells[colStatus] ?? '',
      Cleanup: cells[colCleanup] ?? '',
      Scope: cells[colScope] ?? '',
      _raw: cells
    };
    // 空白行や見出しの取りこぼし除外
    if (!rec.Flag || rec.Flag.toLowerCase() === 'flag') continue;
    out.push(rec);
  }
  return out;
}

function parseDateYYYYMMDD(s) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  return isNaN(dt.getTime()) ? null : dt;
}

function main() {
  const path = 'docs/feature-flags.md';
  if (!fs.existsSync(path)) {
    console.error(`❌ Not found: ${path}`);
    process.exit(1);
  }
  const md = fs.readFileSync(path, 'utf8');
  const rows = parseTable(md);

  if (!rows.length) {
    console.error('❌ Could not parse flags table in docs/feature-flags.md');
    process.exit(1);
  }

  const problems = [];
  const warnings = [];

  for (const r of rows) {
    const type = (r.Type || '').toLowerCase();
    const cleanupRaw = (r.Cleanup || '').trim();

    // Ops は期限不要
    const needsDeadline = ['release', 'experiment'].includes(type);

    if (!needsDeadline) {
      // "N/A" 以外が入っててもスルー（運用に合わせて厳格化可）
      continue;
    }

    if (!cleanupRaw || /^n\/?a$/i.test(cleanupRaw)) {
      (isWarn ? warnings : problems).push(
        `Flag "${r.Flag}": Cleanup missing for Type=${r.Type}`
      );
      continue;
    }

    const dt = parseDateYYYYMMDD(cleanupRaw);
    if (!dt) {
      (isWarn ? warnings : problems).push(
        `Flag "${r.Flag}": Cleanup has invalid format "${cleanupRaw}" (expected YYYY-MM-DD)`
      );
      continue;
    }

    // 期限切れ: dt < todayUTC
    if (dt.getTime() < todayUTC.getTime()) {
      (isWarn ? warnings : problems).push(
        `Flag "${r.Flag}": Cleanup overdue (${cleanupRaw})`
      );
    }
  }

  // サマリ
  console.log('Feature Flags Deadline Check');
  console.log(`  Mode: ${MODE.toUpperCase()}`);
  console.log(`  Today(UTC): ${todayUTC.toISOString().slice(0,10)}`);
  console.log(`  Parsed rows: ${rows.length}`);

  if (warnings.length) {
    console.warn('\n⚠️  Warnings:');
    warnings.forEach(w => console.warn('  - ' + w));
  }

  if (problems.length) {
    console.error('\n❌ Problems:');
    problems.forEach(p => console.error('  - ' + p));
    console.error('\n対処 / How to fix:');
    console.error('  - /docs/feature-flags.md の Cleanup を YYYY-MM-DD で設定し、期限切れを解消してください。');
    console.error('  - Set/Update Cleanup (YYYY-MM-DD) for Release/Experiment flags and resolve overdue items.');
    process.exit(1);
  }

  if (!warnings.length && !problems.length) {
    console.log('\n✅ All flags OK.');
  } else if (warnings.length && !problems.length) {
    console.log('\n✅ Completed with warnings (warn mode).');
  }
}

main();
