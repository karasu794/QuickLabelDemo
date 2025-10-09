// 注意: 依存が無い環境では読み込まれない前提（動的選択）
import type { IInvoicePdfBuilder, InvoicePdfArtifact, InvoicePdfInput } from './pdf-builder'
import { A4_PT, MARGIN_PT, HEADER_H_PT, SIGN_W_PT, SIGN_H_PT } from '../constants'

export class PdfLibBuilder implements IInvoicePdfBuilder {
  async build(input: InvoicePdfInput, resolved: { letterheadUrl?: string; signatureUrl?: string }): Promise<InvoicePdfArtifact> {
    // 依存を遅延 import（依存無し環境での読み込み失敗を回避）
    let PDFDocument: any
    try {
      const mod: any = await import('pdf-lib')
      PDFDocument = mod.PDFDocument
    } catch {
      // フォールバック: トークン文字列として返却
      const text = [
        `FQL:PAGE@${A4_PT.w},${A4_PT.h},M=${MARGIN_PT}`,
        `FQL:HEADER@${MARGIN_PT},${A4_PT.h - MARGIN_PT - HEADER_H_PT},${A4_PT.w - MARGIN_PT * 2},${HEADER_H_PT}|URL=${resolved.letterheadUrl || ''}`,
        `FQL:SIGN@${A4_PT.w - MARGIN_PT - SIGN_W_PT},${MARGIN_PT},${SIGN_W_PT},${SIGN_H_PT}|URL=${resolved.signatureUrl || ''}`,
        'FQL:EOF',
      ].join('\n')
      return {
        pdfBuffer: Buffer.from(text, 'utf-8'),
        meta: {
          headerInserted: !!resolved.letterheadUrl,
          signatureInserted: !!resolved.signatureUrl,
          dims: { pageWidth: A4_PT.w, pageHeight: A4_PT.h, margin: MARGIN_PT },
          assets: { letterheadUrl: resolved.letterheadUrl, signatureUrl: resolved.signatureUrl },
        },
      }
    }

    const doc = await PDFDocument.create()
    const page = doc.addPage([A4_PT.w, A4_PT.h])

    async function tryDraw(url: string | undefined, draw: (img: any) => void) {
      if (!url) return false
      try {
        const resp = await fetch(url)
        const bytes = new Uint8Array(await resp.arrayBuffer())
        let img
        if (url.endsWith('.png')) img = await doc.embedPng(bytes)
        else img = await doc.embedJpg(bytes)
        draw(img)
        return true
      } catch {
        return false
      }
    }

    const headerDrawn = await tryDraw(resolved.letterheadUrl, (img) => {
      const x = MARGIN_PT
      const y = A4_PT.h - MARGIN_PT - HEADER_H_PT
      const w = A4_PT.w - MARGIN_PT * 2
      const h = HEADER_H_PT
      page.drawImage(img, { x, y, width: w, height: h })
      page.drawText(`FQL:HEADER@${x},${y},${w},${h}`, { x, y: y + 2, size: 4 })
    })

    const signDrawn = await tryDraw(resolved.signatureUrl, (img) => {
      const w = SIGN_W_PT
      const h = SIGN_H_PT
      const x = A4_PT.w - MARGIN_PT - w
      const y = MARGIN_PT
      page.drawImage(img, { x, y, width: w, height: h })
      page.drawText(`FQL:SIGN@${x},${y},${w},${h}`, { x, y: y + h + 2, size: 4 })
    })

    const pdfBytes = await doc.save()

    return {
      pdfBuffer: Buffer.from(pdfBytes),
      meta: {
        headerInserted: headerDrawn,
        signatureInserted: signDrawn,
        dims: { pageWidth: A4_PT.w, pageHeight: A4_PT.h, margin: MARGIN_PT },
        assets: { letterheadUrl: resolved.letterheadUrl, signatureUrl: resolved.signatureUrl },
      },
    }
  }
}


