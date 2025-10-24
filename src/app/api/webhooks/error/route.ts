import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// 探索ログ: Webhookエラー集約。Bearer検証・冪等（idempotencyKey）・保存。

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_ERROR_SECRET || ''
    const auth = req.headers.get('authorization') || ''
    if (!secret) return NextResponse.json({ ok: false, code: 'NOT_CONFIGURED' }, { status: 500 })
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })

    let body: any = {}
    try { body = await req.json() } catch {}
    const idempotencyKey = String(body?.idempotencyKey || '')
    const payload = {
      source: String(body?.source || 'unknown'),
      event: String(body?.event || 'error'),
      error: String(body?.error || ''),
      retry: Boolean(body?.retry),
      receivedAt: body?.receivedAt || new Date().toISOString(),
    }

    const sb = createServiceRoleClient()
    if (idempotencyKey) {
      // upsert-like: 同一キーなら最終値で更新
      await (sb as any)
        .from('notifications')
        .upsert({
          type: 'webhook_error',
          message: `${payload.source}:${payload.event}`,
          metadata: { ...payload, idempotencyKey },
          idempotency_key: idempotencyKey,
        }, { onConflict: 'idempotency_key' })
    } else {
      await (sb as any)
        .from('notifications')
        .insert({ type: 'webhook_error', message: `${payload.source}:${payload.event}`, metadata: payload })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'ERROR', message: String(e?.message || e) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'webhooks/error' })
}


