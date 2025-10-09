import { NextResponse } from 'next/server'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import type { Database } from '@/types/supabase'

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
	return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

export async function GET() {
  try {
    const { supabase, user } = await getUserOrThrow()
    const orgId = null // TODO(org-removed)

		const { data, error } = await supabase
			.from('open_shipments')
			.select('*')
			-- TODO(org-removed): org filter removed
			.order('created_at', { ascending: false })

		if (error) {
			return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
		}

		return NextResponse.json({ ok: true, data: data as Database['public']['Tables']['open_shipments']['Row'][] }, { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}


