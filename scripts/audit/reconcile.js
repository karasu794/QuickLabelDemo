// scripts/audit/reconcile.js

import { readFileSync, writeFileSync } from "node:fs";



const parsed = JSON.parse(readFileSync("artifacts/rate_logs/parsed/latest.json","utf8"));

// TODO: UI/DTO の観測ログを追加で読む場合はここに readFileSync で足す



const unknownLabels = []; // 今はダミー（UIログを繋ぎ次第ここに溜める想定）

// 提案出力

if (unknownLabels.length === 0) {

  console.log("No new labels to map. Review base/fuel/peak/delivery_area/discount/other totals.");

  process.exit(0);

}

if (process.argv.includes("--apply")) {

  const path = "src/lib/rates/mapping.ts";

  const s = readFileSync(path, "utf8");

  const add = unknownLabels.map(l => `  "${l}": "other",`).join("\n");

  const out = s.replace(/};\s*$/, `${add}\n};\n`);

  writeFileSync(path, out);

  console.log("mapping.ts updated");

} else {

  console.log("=== mapping candidates ===");

  unknownLabels.forEach(l => console.log(`"${l}": "other",`));

}

