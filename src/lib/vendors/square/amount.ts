/* Square Amount utils
 * 根拠: docs/vendors/square/reference.md の AmountMoney/JPY 説明。
 * - SDKは smallest unit の整数（TypeScript型: bigint）を要求。
 * - アプリ内は number を維持。SDK直前のみ BigInt に変換。
 */
export type NormalizeAmountResult = { amountInt: number; amountBig: bigint }

export function normalizeJPYAmount(amount: unknown): NormalizeAmountResult {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('INVALID_AMOUNT: must be positive number')
  }
  // JPYは小数なし → 四捨五入して整数化
  const int = Math.round(n)
  if (int <= 0) throw new Error('INVALID_AMOUNT: rounded non-positive')
  // SDK直前だけ BigInt を渡すための値
  const big = BigInt(int)
  return { amountInt: int, amountBig: big }
}


