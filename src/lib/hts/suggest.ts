export interface HtsSuggestion {
  code: string
  description: string
}

/**
 * Minimal adapter for HTS suggestions.
 * 現状は既存の `/api/shipments/hs-code` ルートを内部呼び出しし、
 * キー未設定や失敗時は空配列を返す。
 */
export async function fetchHtsSuggestions({ q, dest, limit }: {
  q: string
  dest: string
  limit: number
}): Promise<HtsSuggestion[]> {
  // FEATUREオフの二重ガード（保険）
  const flag = String(process.env.FEATURE_HTS_SUGGESTIONS || '').trim().toLowerCase()
  if (!['1', 'true', 'yes', 'on'].includes(flag)) return []

  // APIキー未設定時は静かに空配列
  const hasExportKey = !!process.env.FEDEX_EXPORT_API_KEY
  if (!hasExportKey) return []

  function withTimeout<T>(p: Promise<T>, ms = 1500): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms)
      p.then((v) => { clearTimeout(t); resolve(v) }).catch((e) => { clearTimeout(t); reject(e) })
    })
  }

  try {
    const requested = Math.min(Math.max(Number(limit) || 10, 1), 20)
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').toString().replace(/\/$/, '')
    const url = base ? `${base}/api/shipments/hs-code` : `/api/shipments/hs-code`

    const r = await withTimeout(fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        searchText: q,
        destinationCountryCode: dest,
        resultsRequested: requested,
      }),
      // 認証は /api/shipments/hs-code 側で不要想定。必要なら credentials 付与
    }), 1500)

    if (!r.ok) return []
    const out = await r.json().catch(() => null)
    if (Array.isArray(out)) {
      return out
        .filter((x) => x && typeof x.code === 'string')
        .map((x) => ({ code: String(x.code), description: String(x.description ?? '') }))
    }
    return []
  } catch {
    return []
  }
}


