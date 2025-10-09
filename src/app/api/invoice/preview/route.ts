import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCommercialInvoicePDF } from '@/lib/pdf/commercialInvoiceTemplate'

export async function GET() {
  try {
    const mode = (process.env.PREVIEW_MODE || 'inline-pdf').toLowerCase()
    if (mode === 'inline-pdf') {
      // 依存なし運用: application/pdf を inline 返却（ビルダーがPDFでない場合は最小PDFにフォールバック）
      let pdf = await buildCommercialInvoicePDF({ supabase: null, userId: 'anon', exporterName: 'Phoenix Co., Ltd. Norio Yamaguchi' })
      const u8 = new Uint8Array(pdf)
      const head = Buffer.from(u8.subarray(0, 4)).toString('utf8')
      if (head !== '%PDF') {
        // 最小1ページPDF
        const minimalPdf = Buffer.from(
          '%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\n4 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n5 0 obj<</Type/Catalog/Pages 4 0 R>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000040 00000 n \n0000000070 00000 n \n0000000135 00000 n \n0000000198 00000 n \ntrailer<</Size 6/Root 5 0 R>>\nstartxref\n260\n%%EOF\n',
          'utf8'
        )
        pdf = minimalPdf
      }
      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'inline; filename="preview.pdf"',
        },
      })
    }

    // JSON URL返却モード（data-url / signed-url）
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    const uid = user?.id || 'anon'
    const pdf = await buildCommercialInvoicePDF({ supabase, userId: uid, exporterName: 'Phoenix Co., Ltd. Norio Yamaguchi' })
    if (mode === 'data-url') {
      const dataUrl = `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}`
      return NextResponse.json({ url: dataUrl }, { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (mode === 'signed-url') {
      // 任意: ストレージ保存に差し替え可能。ここでは固定URLで安定運用
      return NextResponse.json({ url: '/static/preview.pdf' }, { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return NextResponse.json({ url: '/static/preview.pdf' }, { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ url: '/static/preview.png' }, { status: 200, headers: { 'content-type': 'application/json' } })
  }
}


