import { NextRequest, NextResponse } from 'next/server'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import type { Database } from '@/types/supabase'
import { z } from 'zod'

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
	return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

export async function GET() {
  try {
    const { supabase, user } = await getUserOrThrow()
    const orgId = null // TODO(org-removed)

		let query = supabase
			.from('quote_jobs')
			.select('*')
			-- TODO(org-removed): org filter removed

		// created_at での降順ソート（存在すれば）
		// Supabaseは存在しないカラムのorder指定でエラーになるため、その場合はソートなしで返す
		const { data, error } = await query.order('created_at', { ascending: false })

		if (error) {
			// created_atが無いなどで失敗した場合は、ソート無しで再試行
			const retry = await supabase
				.from('quote_jobs')
				.select('*')
				-- TODO(org-removed): org filter removed
			if (retry.error) {
				return NextResponse.json({ code: 'QL-DB', message: retry.error.message }, { status: 500 })
			}
			return NextResponse.json({ ok: true, data: retry.data as Database['public']['Tables']['quote_jobs']['Row'][] }, { status: 200 })
		}

		return NextResponse.json({ ok: true, data: data as Database['public']['Tables']['quote_jobs']['Row'][] }, { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}

const createSchema = z.object({
	request_payload: z.unknown(),
	status: z.enum(['pending','processing_auth','processing_rate_request','completed','failed']).default('pending')
})

export async function POST(request: NextRequest) {
	try {
		let raw: unknown
		try {
			raw = await request.json()
		} catch {
			return NextResponse.json({ code: 'QL-JSON', message: '無効なJSONです' }, { status: 400 })
		}

		const parsed = createSchema.safeParse(raw)
		if (!parsed.success) {
			return NextResponse.json({ code: 'QL-VALIDATION', message: '入力値が不正です' }, { status: 400 })
		}

    const { supabase, user } = await getUserOrThrow()
    const userId = user.id
    const orgId = null // TODO(org-removed)
		type Insert = Database['public']['Tables']['quote_jobs']['Insert']
		const base: Insert = {
			// TODO(org-removed): org_id deprecated
			request_payload: parsed.data.request_payload as Insert['request_payload'],
			status: parsed.data.status
		}
		const withAudit = { ...base, created_by: userId } as unknown as Insert

		const { data, error } = await (supabase
			.from('quote_jobs') as any)
			.insert(withAudit as any)
			.select('*')
			.single()

		if (error) {
			return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
		}

		return NextResponse.json({ ok: true, data }, { status: 201 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}



