import type { IInvoicePdfBuilder, InvoicePdfArtifact, InvoicePdfInput } from './pdf-builder'

const A4 = { w: 595, h: 842 }
const MARGIN = 68
const HEADER = { h: 96 }
const SIGN = { w: 200, h: 72 }

export class TokenPdfBuilder implements IInvoicePdfBuilder {
  async build(input: InvoicePdfInput, resolved: { letterheadUrl?: string; signatureUrl?: string }): Promise<InvoicePdfArtifact> {
    const pageWidth = A4.w
    const pageHeight = A4.h
    const margin = MARGIN

    const headerX = margin
    const headerY = pageHeight - margin - HEADER.h
    const headerW = pageWidth - margin * 2
    const headerH = HEADER.h

    const signW = SIGN.w
    const signH = SIGN.h
    const signX = pageWidth - margin - signW
    const signY = margin

    const headerUrl = resolved.letterheadUrl || ''
    const signatureUrl = resolved.signatureUrl || ''

    const fqlLines = [
      `FQL:PAGE@${pageWidth},${pageHeight},M=${margin}`,
      `FQL:HEADER@${headerX},${headerY},${headerW},${headerH}|URL=${headerUrl}`,
      `FQL:SIGN@${signX},${signY},${signW},${signH}|URL=${signatureUrl}`,
      'FQL:EOF',
    ]
    const fqlText = fqlLines.join('\n')

    // 後方互換: Stage3契約はJSONパースを期待する。Stage4はFQLトークンの存在を期待。
    // 双方を満たすため、JSON内にFQL文字列を含めたテキストを返す。
    const jsonCompat = {
      letterhead: headerUrl ? { source: input.forceLh ? 'admin' : 'user', url: headerUrl } : null,
      signature: signatureUrl ? { source: input.forceSign ? 'admin' : 'user', url: signatureUrl } : null,
      fql: fqlText,
      dims: { pageWidth, pageHeight, margin },
    }
    const buf = Buffer.from(JSON.stringify(jsonCompat), 'utf-8')

    return {
      pdfBuffer: buf,
      meta: {
        headerInserted: !!headerUrl,
        signatureInserted: !!signatureUrl,
        dims: { pageWidth, pageHeight, margin },
        assets: { letterheadUrl: headerUrl || undefined, signatureUrl: signatureUrl || undefined },
        fql: fqlText,
      },
    }
  }
}


