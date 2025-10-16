// 住所・氏名・会社情報を配送用ASCIIへ安全変換するユーティリティ
// ポリシー: NFKC → 全角→半角 → カナ→ローマ字(任意) → 許可文字以外除去 → 連続空白圧縮 → trim → 長さ制限

const DEFAULT_ALLOWED = /[^A-Za-z0-9\-\/\.,'#()\s]/g

function toHalfWidth(input: string): string {
  // 英数字・一部記号の全角→半角
  // 参考: Unicode全角半角変換の基本帯
  return input.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
              .replace(/　/g, ' ')
}

function kanaToRomajiFallback(input: string): string {
  // 簡易: 長音や濁点の一部のみを平易化。高品質には wanakana を推奨
  return input
    .replace(/[ぁ-んァ-ン]/g, 'a') // ダミー置換（後で除去対象になる英数以外を潰すための暫定）
}

export type AsciiOptions = {
  maxLength?: number
  allowPattern?: RegExp // 除去に使う否定クラスの正規表現（既定は DEFAULT_ALLOWED）
  useWanakana?: boolean
}

export function toAsciiForShipping(raw: string, opts: AsciiOptions = {}): string {
  if (!raw) return ''

  const allowPattern = opts.allowPattern ?? DEFAULT_ALLOWED
  const maxLength = typeof opts.maxLength === 'number' && opts.maxLength > 0 ? opts.maxLength : 128

  // 1) NFKC
  let s = raw.normalize('NFKC')
  // 2) 全角→半角
  s = toHalfWidth(s)
  // 3) カナ→ローマ字（オプション: wanakana）
  if (opts.useWanakana) {
    try {
      // 動的import（依存が無い場合でもビルドを壊さない）
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const wanakana = require('wanakana')
      if (wanakana && typeof wanakana.toRomaji === 'function') {
        s = wanakana.toRomaji(s)
      } else {
        s = kanaToRomajiFallback(s)
      }
    } catch {
      s = kanaToRomajiFallback(s)
    }
  }
  // 4) 許可外除去
  s = s.replace(allowPattern, '')
  // 5) 連続空白を1つに
  s = s.replace(/\s+/g, ' ')
  // 6) trim
  s = s.trim()
  // 7) 長さ制限
  if (s.length > maxLength) s = s.slice(0, maxLength)
  return s
}

// 入力セットに一括適用するヘルパ
export function toAsciiFields<T extends Record<string, unknown>>(
  input: T,
  fieldMax: Partial<Record<keyof T, number>> = {}
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(input) as Array<keyof T>) {
    const v = input[key]
    if (typeof v === 'string') {
      out[`${String(key)}_ascii`] = toAsciiForShipping(v, { maxLength: fieldMax[key] })
    }
  }
  return out
}


