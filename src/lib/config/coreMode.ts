// CORE_MODE: 環境フラグの薄いヘルパと公開値

function toBool(v: unknown, def = false): boolean {
  if (v == null) return def
  const s = String(v).toLowerCase().trim()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}

// CORE_MODE: 体験重視の最小ダウングレードモード（サーバ側評価）
export const CORE_MODE = toBool(process.env.CORE_MODE, false)

export { toBool }


