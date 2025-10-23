import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { withApiLogging } from '@/app/api/_observability/withApiLogging'
import { createLogger } from '@/lib/observability/logger'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const logger = createLogger('api.drafts.get', req.headers.get('x-diag-id') || undefined)
  return withApiLogging('api.drafts.get', req, async () => {
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })

    const supabase = createRouteHandlerClient()
    const { data: me } = await supabase.auth.getUser()
    if (!me?.user) {
      logger.warn({ step: 'auth', error_code: 'UNAUTHORIZED' })
      return NextResponse.json({ error: 'UNAUTHORIZED', reason: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('drafts' as any)
      .select('id, selected_rate, shipper_country, recipient_country, updated_at')
      .eq('id', id as any)
      .eq('user_id', me.user.id as any)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'DB_ERROR', details: error.message }, { status: 500 })
    if (!data) {
      logger.warn({ step: 'draft.lookup', error_code: 'NOT_FOUND', context: { draftId: id } })
      return NextResponse.json({ error: 'NOT_FOUND', reason: 'DRAFT_NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, draft: data })
  })
}


