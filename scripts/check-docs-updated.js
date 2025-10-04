#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require("child_process");

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  } catch (e) {
    return "";
  }
}

function getBase() {
  const hasOriginMain = sh("git rev-parse --verify origin/main");
  if (hasOriginMain) return "origin/main";
  const hasMain = sh("git rev-parse --verify main");
  if (hasMain) return "main";
  return ""; // initial repo: treat as no diff
}

function getChangedFiles(base) {
  if (!base) return [];
  const out = sh(`git diff --name-only --diff-filter=ACMRT ${base}...HEAD`);
  if (!out) return [];
  return out.split("\n").filter(Boolean);
}

function anyMatch(files, regexes) {
  return files.some((f) => regexes.some((r) => r.test(f)));
}

function main() {
  const base = getBase();
  const changed = getChangedFiles(base);

  // Canonical docs only (direct children of /docs). Exclude /docs/archive/**
  const canonicalDocs = new Set(
    changed.filter((f) => /^docs\/[^/]+\.md$/.test(f))
  );

  // Change detectors
  const pApi = [/^src\/app\/api\/.+\/route\.ts$/];
  const pRepo = [/^src\/lib\/server\/repos\//];
  const pCtx  = [/^src\/middleware\.ts$/, /^src\/lib\/server\/context\.ts$/];
  const pSchema = [/\.schema\.ts$/, /zod/i, /^src\/.+\/schemas\//];
  const pFlags  = [/^src\/.+\/flags\//, /^src\/.+\/feature-flag\//, /^src\/.+\/featureFlags\//];

  const touchedApi    = anyMatch(changed, pApi);
  const touchedRepo   = anyMatch(changed, pRepo);
  const touchedCtx    = anyMatch(changed, pCtx);
  const touchedSchema = anyMatch(changed, pSchema);
  const touchedFlags  = anyMatch(changed, pFlags);

  const needArchindex  = touchedApi || touchedRepo || touchedCtx;
  const needGuardrails = touchedSchema;
  const needFlagsDoc   = touchedFlags;

  // Which canonical docs were touched
  const hasArchindex  = canonicalDocs.has("docs/ARCHINDEX.md");
  const hasGuardrails = canonicalDocs.has("docs/Guardrails.md");
  const hasFlagsDoc   = canonicalDocs.has("docs/feature-flags.md");

  // Guardrails strictness (default strict). Set DOC_CHECK_GUARDRAILS=warn for warnings.
  const guardrailsMode = (process.env.DOC_CHECK_GUARDRAILS || "strict").toLowerCase(); // 'strict' | 'warn'
  const warnOnly = guardrailsMode === "warn";

  const missing = [];

  if (needArchindex && !hasArchindex) {
    missing.push("docs/ARCHINDEX.md (API/Repo/Context changes need ARCHINDEX update)");
  }
  if (needGuardrails && !hasGuardrails) {
    if (!warnOnly) {
      missing.push("docs/Guardrails.md (Schema/Zod changes need Guardrails update)");
    }
  }
  if (needFlagsDoc && !hasFlagsDoc) {
    missing.push("docs/feature-flags.md (Feature Flag changes need flags ledger update)");
  }

  const summary = [
    "Doc Check Summary:",
    `  - API Routes changed: ${touchedApi ? "YES" : "no"}`,
    `  - Repos changed:      ${touchedRepo ? "YES" : "no"}`,
    `  - Ctx/MW changed:     ${touchedCtx ? "YES" : "no"}`,
    `  - Schema/Zod changed: ${touchedSchema ? "YES" : "no"} (Guardrails mode: ${warnOnly ? "WARN" : "STRICT"})`,
    `  - Flags changed:      ${touchedFlags ? "YES" : "no"}`,
    "",
    "Canonical docs touched (directly under /docs):",
    `  - ARCHINDEX.md:       ${hasArchindex ? "✅" : "—"}`,
    `  - Guardrails.md:      ${hasGuardrails ? "✅" : "—"}`,
    `  - feature-flags.md:   ${hasFlagsDoc ? "✅" : "—"}`,
    "",
  ].join("\n");

  if (missing.length) {
    console.error(summary);
    const header = warnOnly && missing.some((m) => m.includes("Guardrails.md"))
      ? "⚠️ Missing recommended doc updates (warning mode):"
      : "❌ Missing required doc updates:";
    console.error(header);
    missing.forEach((m) => console.error("  - " + m));

    console.error("\nHow to fix / 対処:");
    console.error(" - Update corresponding canonical docs and re-run 'npm run doc-check'.");
    console.error(" - 必要な正準ドキュメントを更新して再実行してください。");

    // In warn mode, if only Guardrails is missing, exit 0; otherwise fail
    const onlyGuardrailsMissing = missing.length === 1 && missing[0].includes("Guardrails.md");
    if (warnOnly && onlyGuardrailsMissing) {
      console.warn("Completed with warnings (Guardrails in warn mode).");
      process.exit(0);
    } else {
      process.exit(1);
    }
  } else {
    console.log(summary);
    console.log("✅ Doc check passed.");
  }
}

main();
