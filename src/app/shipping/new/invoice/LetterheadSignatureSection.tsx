"use client"
import React, { useState } from 'react'

export type Asset = { id: string; url: string; mime: string; owner_id?: string }
export type Props = {
  forceLetterhead: boolean
  forceSignature: boolean
  userLetterheads: Asset[]
  userSignatures: Asset[]
  initialExporterName?: string
}

export default function LetterheadSignatureSection(p: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  async function handlePreview() {
    try {
      const url = '/api/invoice/preview'
      const res = await fetch(url, { method: 'GET' })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/pdf')) {
        setPreviewUrl(url)
      } else if (ct.includes('application/json')) {
        const j = await res.json()
        if (j && typeof j.url === 'string') setPreviewUrl(j.url)
        else setPreviewUrl('/static/preview.pdf')
      } else {
        setPreviewUrl('/static/preview.pdf')
      }
    } catch {
      setPreviewUrl('/static/preview.pdf')
    }
  }
  const letterheadUI = p.forceLetterhead ? (
    <p className="text-sm" data-testid="lh-explainer">Phoenixのレターヘッドが適用されます（管理設定ON）</p>
  ) : (
    <div data-testid="lh-section">
      <h4 className="font-medium">レターヘッド</h4>
      {/* TODO: ラジオ/リストでユーザー資産 p.userLetterheads から選択 */}
    </div>
  )

  const signatureUI = p.forceSignature ? (
    <p className="text-sm" data-testid="sign-explainer">Phoenixの署名が適用されます（管理設定ON）</p>
  ) : (
    <div data-testid="sign-section">
      <h4 className="font-medium">署名</h4>
      {/* TODO: ラジオ/リストでユーザー資産 p.userSignatures から選択 */}
    </div>
  )

  const hideExporterFields = p.forceLetterhead || p.forceSignature

  return (
    <section className="space-y-6" data-testid="invoice-form">
      {letterheadUI}
      {signatureUI}
      {!hideExporterFields ? (
        <div>
          <h4 className="font-medium">輸出者名</h4>
          {/* TODO: テキスト入力 */}
        </div>
      ) : (
        <div data-testid="exporter-name">
          <h4 className="font-medium">輸出者名</h4>
          <p className="text-sm">Phoenix Co., Ltd. Norio Yamaguchi</p>
        </div>
      )}
      {!hideExporterFields ? (
        <div data-testid="shipper-different-toggle" className="flex items-center gap-2">
          <input type="checkbox" aria-label="販売者と荷送人が異なる" />
          <span className="text-sm">販売者と荷送人が異なる</span>
        </div>
      ) : null}
      <div className="space-y-2">
        <button type="button" data-testid="preview-button" className="px-3 py-2 border rounded" onClick={handlePreview}>
          プレビューを表示
        </button>
        {previewUrl ? (
          <div data-testid="preview-url" className="text-xs text-gray-600 break-all">
            <a href={previewUrl} target="_blank" rel="noreferrer" className="underline">{previewUrl}</a>
          </div>
        ) : null}
      </div>
    </section>
  )
}


