// scripts/audit/parse_rates.js

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

import { dirname } from "node:path";



const IN = process.argv.includes("--in") ? process.argv[process.argv.indexOf("--in")+1] : null;

const OUT = "artifacts/rate_logs/parsed/latest.json";

if (!IN) { console.error("Usage: node scripts/audit/parse_rates.js --in <path>"); process.exit(1); }



const text = readFileSync(IN, "utf8");

// ケース分割: POST /api/quote を目印に分割

const chunks = text.split(/POST\s+\/api\/quote/).filter(Boolean);



const num = (s) => {

  if (!s) return 0;

  const m = (""+s).replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/);

  return m ? Number(m[0]) : 0;

};



const pick = (chunk, label) => {

  const re = new RegExp(label+"[^\\n]*?(\\d[\\d,\\.]+)", "i");

  const m = chunk.match(re);

  return m ? num(m[1]) : 0;

};



const serviceFrom = (chunk) => {

  // サービス名やコード行から推定（ゆるめ）

  const m = chunk.match(/International\s+(Priority|Economy|Priority\s*Express)/i);

  return m ? ("IPD:"+m[1].toLowerCase()) : "unknown";

};



const cases = chunks.map((c, i) => {

  // 代表的なキーを拾う（足りなければ後で mapping 側で昇格）

  const base = pick(c, "base") || pick(c, "小計") || pick(c, "subtotal");

  const total = pick(c, "total") || pick(c, "合計");

  const fuel = pick(c, "fuel");

  const peak = pick(c, "peak");

  const delivery = pick(c, "delivery[_\\- ]?area|配達地域外");

  const discount = pick(c, "discount|割引");

  // other は残差として計算（負になれば0）

  let other = total - (base + fuel + peak + delivery + discount);

  if (!isFinite(other) || other < 0) other = 0;



  return {

    idx: i+1,

    service_code: serviceFrom(c),

    base, fuel, peak, delivery_area: delivery, discount, other, total,

  };

});



mkdirSync(dirname(OUT), { recursive: true });

writeFileSync(OUT, JSON.stringify({ source: IN, cases }, null, 2));

console.log(`Wrote ${OUT} with ${cases.length} cases`);

