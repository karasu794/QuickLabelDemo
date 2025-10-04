// 配列でなければ空配列にする
export function toArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

// 安全な map（対象が配列でない場合は空配列を返す）
export function mapOrEmpty<T, R>(v: unknown, fn: (x: T, i: number) => R): R[] {
  return Array.isArray(v) ? (v as T[]).map(fn) : []
}

// オブジェクトの shallow default 適用
export function withDefaults<T extends object>(obj: Partial<T> | undefined, defaults: T): T {
  return { ...defaults, ...(obj || {}) } as T
}


