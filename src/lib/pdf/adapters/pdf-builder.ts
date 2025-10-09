export type InvoicePdfInput = {
  forceLh: boolean
  forceSign: boolean
  userId: string
}

export type InvoicePdfArtifact = {
  pdfBuffer: Buffer
  meta: {
    headerInserted: boolean
    signatureInserted: boolean
    dims: { pageWidth: number; pageHeight: number; margin: number }
    assets: { letterheadUrl?: string; signatureUrl?: string }
    fql?: string
  }
}

export interface IInvoicePdfBuilder {
  build(input: InvoicePdfInput, resolved: { letterheadUrl?: string; signatureUrl?: string }): Promise<InvoicePdfArtifact>
}


