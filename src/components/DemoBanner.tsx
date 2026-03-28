'use client'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

export default function DemoBanner() {
  if (!IS_DEMO) return null
  return (
    <div
      role="status"
      className="bg-amber-500 text-white text-center text-sm py-1.5 px-4 font-medium tracking-wide"
    >
      🚧 デモ環境 — 決済・ラベル発行などの外部連携は無効化されています
    </div>
  )
}
