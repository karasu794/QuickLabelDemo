import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PutBody {
  service_code: string
  label?: string
  rate_id?: string | null
  total: number
  currency: string
  breakdown?: any
  quoted_at?: string
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const draftId = params.id
  if (!draftId) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })
  let body: PutBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }
  if (!body?.service_code || !body?.currency || typeof body?.total !== 'number') {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 })
  }
  const supabase = createClient()
  // 所有者検証（RLS前提、さらにWHERE user_id = auth.uid() を掛ける）
  const { data: me } = await supabase.auth.getUser()
  if (!me?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const payload = {
    selected_rate: {
      service_code: body.service_code,
      label: body.label ?? body.service_code,
      rate_id: body.rate_id ?? null,
      total: body.total,
      currency: body.currency,
      breakdown: body.breakdown ?? null,
      quoted_at: body.quoted_at || new Date().toISOString(),
    }
  }

  const { error } = await (supabase as any)
    .from('drafts')
    .update(payload)
    .eq('id', draftId)
    .eq('user_id', me.user.id)

  if (error) {
    return NextResponse.json({ error: 'UPDATE_FAILED', details: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}


