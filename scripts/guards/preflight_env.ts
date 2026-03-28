#!/usr/bin/env tsx
/**
 * 環境変数プリフライトチェック
 * 
 * FEDEX_SAFE_MODE=rate-only と FEDEX_MAX_RPM の妥当性を検証
 */

import process from "node:process";

const req = {
  FEDEX_ENV: "production",
  FEDEX_SAFE_MODE: "rate-only",
};

let ok = true;
const errs: string[] = [];

for (const [k, v] of Object.entries(req)) {
  if (process.env[k] !== v) {
    ok = false;
    errs.push(`${k} must be '${v}', got '${process.env[k] ?? "undefined"}'`);
  }
}

const maxRpm = Number(process.env.FEDEX_MAX_RPM ?? "");
if (!Number.isFinite(maxRpm) || maxRpm <= 0 || maxRpm > 60) {
  ok = false;
  errs.push("FEDEX_MAX_RPM must be a number 1..60");
}

if (process.env.FEDEX_KILL_SWITCH === "true") {
  ok = false;
  errs.push("FEDEX_KILL_SWITCH must be false for run");
}

if (!ok) {
  console.error("[guards][preflight] FAIL\n" + errs.join("\n"));
  process.exit(1);
}

console.log("[guards][preflight] OK");

