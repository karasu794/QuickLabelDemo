import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOTS = ["src", "scripts"];
const RE = /(https?:\/\/apis\.fedex\.com\/(?:ship|openship)\/|\/ship\/v1\/|\/openship\/)/i;

function walk(p: string, out: string[]): string[] {
  for (const f of readdirSync(p)) {
    const fp = join(p, f);
    const st = statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(f)) out.push(fp);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r, []));
const bad = files.filter((fp) => RE.test(readFileSync(fp, "utf8")));

if (bad.length) {
  console.error("Forbidden FedEx endpoints detected in:\n" + bad.join("\n"));
  process.exit(1);
}

console.log("OK: no forbidden endpoints.");

