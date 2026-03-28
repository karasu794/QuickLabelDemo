import { BANNED_PATHS } from "./endpoints";
import { safeLog } from "@/lib/logging/safeLog";

const SAFE_MODE = (process.env.FEDEX_SAFE_MODE ?? "rate-only").toLowerCase(); // rate-only / allow-all
const KILL = (process.env.FEDEX_KILL_SWITCH ?? "false").toLowerCase() === "true";

export function assertSafeUrl(url: string): void {
  if (KILL) throw new Error("FEDEX_KILL_SWITCH=true: 全FedEx呼び出しを停止中");
  if (SAFE_MODE === "allow-all") return;
  const u = url.toLowerCase();
  for (const b of BANNED_PATHS) {
    if (u.includes(b)) {
      throw new Error(`Blocked FedEx endpoint by policy: ${b} (${url})`);
    }
  }
  // 明示許可: /rate/ のみ（oauthは別扱い）
  if (!u.includes("/rate/") && !u.includes("/oauth/token")) {
    throw new Error(`Not allowed in SAFE_MODE=rate-only: ${url}`);
  }
}

export async function fedexFetch(url: string, init: RequestInit = {}): Promise<Response> {
  assertSafeUrl(url);
  const res = await fetch(url, init);
  // 失敗しすぎると即停止（監視）
  if (res.status >= 400) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `FedEx HTTP ${res.status} ${res.statusText} :: ${safeLog(body).slice(0, 2000)}`
    );
  }
  return res;
}

