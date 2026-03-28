#!/usr/bin/env tsx
/**
 * ランタイムチェック: ログディレクトリからShip系エンドポイントの呼び出し痕跡を検出
 * 
 * usage: tsx scripts/guards/runtime_check.ts <log_dir>
 */

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];

if (!dir) {
  console.error("usage: tsx scripts/guards/runtime_check.ts <log_dir>");
  process.exit(1);
}

if (!fs.existsSync(dir)) {
  console.error(`[guards][runtime] Directory not found: ${dir}`);
  process.exit(1);
}

function grep(p: string, re: RegExp): number {
  try {
    const s = fs.readFileSync(p, "utf8");
    return (s.match(re) ?? []).length;
  } catch {
    return 0;
  }
}

let shipHits = 0;
let files = 0;

function scanDirectory(dirPath: string) {
  for (const f of fs.readdirSync(dirPath)) {
    const rp = path.join(dirPath, f);
    const stat = fs.statSync(rp);
    
    if (stat.isDirectory()) {
      scanDirectory(rp);
      continue;
    }
    
    if (f.endsWith(".log") || f.endsWith(".json")) {
      files++;
      shipHits += grep(rp, /\/ship\/v1\/shipments|\/openship\//g);
    }
  }
}

scanDirectory(dir);

if (shipHits > 0) {
  console.error(
    `[guards][runtime] Ship-like endpoints detected: ${shipHits} occurrences`
  );
  process.exit(1);
}

console.log(`[guards][runtime] OK (files scanned=${files}, ship hits=0)`);

