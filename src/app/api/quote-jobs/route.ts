import { NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'
import type { Database } from '@/types/supabase'

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
	return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

export async function GET() {
	try {
		const { supabase, orgId } = await requireOrg()

		let query = supabase
			.from('quote_jobs')
			.select('*')
			.eq('org_id', orgId)

		// created_at での降順ソート（存在すれば）
		// Supabaseは存在しないカラムのorder指定でエラーになるため、その場合はソートなしで返す
		const { data, error } = await query.order('created_at', { ascending: false })

		if (error) {
			// created_atが無いなどで失敗した場合は、ソート無しで再試行
			const retry = await supabase
				.from('quote_jobs')
				.select('*')
				.eq('org_id', orgId)
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



