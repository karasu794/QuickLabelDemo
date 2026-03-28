// 単純トークンバケツ: FEDEX_MAX_RPM (1分あたり最大呼出)
const MAX_RPM = parseInt(process.env.FEDEX_MAX_RPM ?? "30", 10);
let tokens = MAX_RPM;
let last = Date.now();

function refill(): void {
  const now = Date.now();
  const delta = now - last;
  const add = Math.floor((delta / 60000) * MAX_RPM);
  if (add > 0) {
    tokens = Math.min(MAX_RPM, tokens + add);
    last = now;
  }
}

export async function throttle<T>(fn: () => Promise<T>): Promise<T> {
  refill();
  if (tokens <= 0) {
    const wait = 1000; // 1秒待ちで様子見
    await new Promise((r) => setTimeout(r, wait));
    return throttle(fn);
  }
  tokens--;
  return fn();
}

