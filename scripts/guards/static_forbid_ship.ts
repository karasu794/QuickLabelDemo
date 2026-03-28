#!/usr/bin/env tsx
/**
 * 静的チェック: Ship系エンドポイントの禁止文字列検出
 * 
 * src/ 配下のコードから /ship/v1/shipments, /openship/, /commodity/ を検出
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  /\/ship\/v1\/shipments/,
  /\/openship\//,
  /\/commodity\//,
];

let hits: string[] = [];

function walk(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    
    if (st.isDirectory()) {
      if (!p.includes("node_modules") && !p.includes(".next")) {
        walk(p);
      }
      continue;
    }
    
    if (!p.endsWith(".ts") && !p.endsWith(".tsx") && !p.endsWith(".js")) {
      continue;
    }
    
    const s = fs.readFileSync(p, "utf8");
    for (const re of forbidden) {
      if (re.test(s)) {
        hits.push(p);
      }
    }
  }
}

walk(path.join(root, "src"));
walk(path.join(root, "scripts"));

if (hits.length) {
  console.error(
    "[guards][static] FORBIDDEN ENDPOINT STRINGS FOUND:\n" + hits.join("\n")
  );
  process.exit(1);
}

console.log("[guards][static] OK");

