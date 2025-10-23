import { NextRequest } from 'next/server'
import { createLogger, maskPII } from '@/lib/observability/logger'

type WithApiLoggingOptions = {
  diagId?: string
  context?: Record<string, unknown>
}

/**
 * APIハンドラの開始/終了を共通フォーマットでログ出力する薄いラッパ
 * - 重要ヘッダは最小限のみ出力（PIIは出力しない）
 * - 失敗時は error を構造化して出力
 */
export async function withApiLogging<T>(
  namespace: string,
  req: NextRequest,
  fn: () => Promise<T>,
  opts?: WithApiLoggingOptions
): Promise<T> {
  const diagId = opts?.diagId || req.headers.get('x-diag-id') || undefined
  const log = createLogger(namespace, diagId)

  const baseCtx = {
    method: req.method,
    path: req.nextUrl?.pathname,
    diagId: diagId,
    hdr: {
      'x-diag-id': req.headers.get('x-diag-id') || undefined,
      'x-draft-id': req.headers.get('x-draft-id') || undefined,
      'content-type': req.headers.get('content-type') || undefined,
    },
    ...(opts?.context || {}),
  }

  log.info({ step: 'request.start', context: maskPII(baseCtx) })
  const startedAt = Date.now()

  try {
    const result = await fn()
    const finishedCtx = { duration_ms: Date.now() - startedAt }
    log.info({ step: 'request.done', ok: true, context: finishedCtx })
    return result
  } catch (err: any) {
    const finishedCtx = {
      duration_ms: Date.now() - startedAt,
      error_code: err?.code,
      error_message: err?.message,
    }
    log.error({ step: 'request.fail', ok: false, context: finishedCtx, error: err })
    throw err
  }
}


