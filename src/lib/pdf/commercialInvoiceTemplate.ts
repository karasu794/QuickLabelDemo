import { getEffectiveLetterhead } from '@/lib/letterhead/getEffectiveLetterhead'
import { getEffectiveSignature } from '@/lib/signature/getEffectiveSignature'
import { TokenPdfBuilder } from './adapters/token.builder'

export async function buildCommercialInvoicePDF(opts: {
  supabase: any
  userId: string
  exporterName: string
}) {
  const letterhead = await getEffectiveLetterhead(opts.userId)
  const signature = await getEffectiveSignature(opts.userId)

  const builderName = process.env.PDF_BUILDER || 'token'
  const builder = builderName === 'pdf-lib'
    ? new (await import('./adapters/pdf-lib.builder').then(m => m.PdfLibBuilder).catch(() => TokenPdfBuilder))()
    : new TokenPdfBuilder()
  const artifact = await builder.build(
    { forceLh: (letterhead?.source === 'admin'), forceSign: (signature?.source === 'admin'), userId: opts.userId },
    { letterheadUrl: letterhead?.url, signatureUrl: signature?.url }
  )
  return artifact.pdfBuffer
}


