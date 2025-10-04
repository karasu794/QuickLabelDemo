#!/usr/bin/env node
import { execSync } from "node:child_process";

const STEPS = [
  { name: "Doc Check",            cmd: "npm run -s doc-check" },
  { name: "Flag Deadlines",       cmd: "npm run -s flag-deadlines" },            // 厳格
  // { name: "Flag Deadlines (warn)", cmd: "npm run -s flag-deadlines:warn" },   // warn運用に切替える場合
  { name: "Drift Weekly",         cmd: "npm run -s drift:weekly" },
  { name: "Contracts",            cmd: "npm run -s test:contracts" },
  { name: "E2E",                  cmd: "npm run -s e2e:ci" }                     // Playwright 前提
  // { name: "E2E (Cypress)",        cmd: "npm run -s e2e:ci:cy" },              // Cypress派の場合
];

const results = [];

function run(step) {
  console.log(`\n=== ${step.name} ===`);
  try {
    const out = execSync(step.cmd, { stdio: "pipe", encoding: "utf8" });
    console.log(out.trim());
    results.push({ name: step.name, status: "PASS" });
  } catch (e) {
    const msg = e?.stdout?.toString?.() || e?.message || String(e);
    console.error(msg.trim());
    results.push({ name: step.name, status: "FAIL" });
    summaryAndExit(1);
  }
}

function summaryAndExit(code = 0) {
  console.log("\nRESULT:");
  for (const r of results) {
    console.log(`- ${r.name}: ${r.status}`);
  }
  process.exit(code);
}

for (const step of STEPS) run(step);
summaryAndExit(0);
