// scripts/probe/smoke.ts
/* 5-minute smoke probe for Lite FQL
 * Checks:
 *  - build done (run by npm script before this)
 *  - /api/quote returns 2xx
 *  - /api/ship/create GET -> 405 (ensurePost)
 *  - /api/ship/create POST -> 2xx and NOT 403 (CSRF removed)
 *  - burst POST x5 -> no 429 (rate limit removed)
 */

type Check = { name: string; run: () => Promise<void> };

const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 60000);

function abortAfter(ms: number, msg: string) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(msg), ms);
  return { signal: c.signal, cancel: () => clearTimeout(t) };
}

async function req(path: string, init?: RequestInit): Promise<Response> {
  const url = `${BASE}${path}`;
  const { signal, cancel } = abortAfter(15000, `Timeout: ${url}`);
  try {
    const res = await fetch(url, { ...init, signal });
    return res;
  } finally {
    cancel();
  }
}

function expectStatusRange(res: Response, min: number, max: number, ctx: string) {
  if (res.status < min || res.status > max) {
    throw new Error(`${ctx} expected ${min}-${max}, got ${res.status}`);
  }
}

function expectStatus(res: Response, code: number, ctx: string) {
  if (res.status !== code) {
    throw new Error(`${ctx} expected ${code}, got ${res.status}`);
  }
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

const checks: Check[] = [
  {
    name: `GET /api/quote -> 2xx`,
    run: async () => {
      const res = await req("/api/quote");
      expectStatusRange(res, 200, 299, "GET /api/quote");
      // optional response shape sanity
      const ct = res.headers.get("content-type") || "";
      assert(ct.includes("application/json"), "quote response not JSON");
    },
  },
  {
    name: "GET /api/quote/{jobId} anonymous -> 200 or 404 (no 401)",
    run: async () => {
      const res = await req("/api/quote/dummy-id-that-may-not-exist");
      if (res.status === 401) throw new Error("anonymous access blocked by auth");
      if (![200, 404].includes(res.status)) {
        throw new Error(`unexpected status ${res.status}`);
      }
    },
  },
  {
    name: `GET /api/ship/create -> 405 (ensurePost)`,
    run: async () => {
      const res = await req("/api/ship/create");
      expectStatus(res, 405, "GET /api/ship/create");
    },
  },
  {
    name: `POST /api/ship/create -> 2xx or 503 (no 403; CSRF removed)`,
    run: async () => {
      const res = await req("/api/ship/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ probe: true }),
      });
      // 403 は出さない（CSRF撤去の確認）
      if (res.status === 403) {
        throw new Error("got 403 (CSRF or forbidden) — should be removed");
      }
      // 2xx か 503 (WRITE_DISABLED ラッチ)
      if (!((res.status >= 200 && res.status < 300) || res.status === 503)) {
        throw new Error(`expected 2xx or 503 (latch), got ${res.status}`);
      }
    },
  },
  {
    name: `Burst x5 POST /api/ship/create -> allow 2xx or 503; no 403/429`,
    run: async () => {
      const runs = Array.from({ length: 5 }).map((_, i) =>
        req("/api/ship/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ probe: true, i }),
        })
      );
      const results = await Promise.all(runs);
      const codes = results.map(r => r.status);

      // 403/429 は不可
      if (codes.some(c => c === 403)) {
        throw new Error(`got 403 in burst (should be removed): [${codes.join(", ")}]`);
      }
      if (codes.some(c => c === 429)) {
        throw new Error(`got 429 in burst (rate limit not removed): [${codes.join(", ")}]`);
      }

      // 2xx または 503（ラッチOFF）のみ許可
      const allowed = (c: number) => (c >= 200 && c < 300) || c === 503;
      if (!codes.every(allowed)) {
        throw new Error(`unexpected status in burst (expect 2xx or 503): [${codes.join(", ")}]`);
      }
    },
  },
  // Optional: /admin exists check (don’t fail build if missing)
  {
    name: `(optional) /admin reachable if route exists`,
    run: async () => {
      const res = await req("/admin");
      // allow 200/404 — we only fail if it's a redirect loop or 5xx
      if (res.status >= 500) {
        throw new Error(`/admin returned ${res.status}`);
      }
    },
  },
];

async function main() {
  const started = Date.now();
  console.log(`SMOKE start BASE=${BASE}`);

  for (const c of checks) {
    try {
      await c.run();
      console.log(`✅ ${c.name}`);
    } catch (e: any) {
      console.error(`❌ ${c.name}: ${e?.message || e}`);
      process.exitCode = 1;
      break; // stop early on first failure
    }
  }

  const elapsed = Date.now() - started;
  console.log(`SMOKE done in ${elapsed}ms`);
  if (elapsed > TIMEOUT_MS) {
    console.error(`❌ Smoke exceeded TIMEOUT ${TIMEOUT_MS}ms`);
    process.exitCode = 1;
  }

  if (process.exitCode === 0) {
    console.log("READY=TRUE");
  }
}

main().catch((e) => {
  console.error("❌ SMOKE crashed:", e);
  process.exit(1);
});


