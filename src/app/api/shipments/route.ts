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
		const userId = user.id

		let query = supabase
			.from('shipments')
			.select('*')
			.eq('user_id', userId)

		const { data, error } = await query.order('created_at', { ascending: false })
		if (error) {
			// created_at がない等のケースではソート無しで再実行
			const retry = await supabase
				.from('shipments')
				.select('*')
				.eq('user_id', userId)
			if (retry.error) {
				return NextResponse.json({ code: 'QL-DB', message: retry.error.message }, { status: 500 })
			}
			return NextResponse.json({ ok: true, data: retry.data as Database['public']['Tables']['shipments']['Row'][] }, { status: 200 })
		}

		return NextResponse.json({ ok: true, data: data as Database['public']['Tables']['shipments']['Row'][] }, { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}

const createSchema = z.object({
	tracking_number: z.string().min(1),
	status: z.string().min(1),
	label_url: z.string().url().optional(),
	total_amount: z.number().optional(),
	shipper_country: z.string().optional(),
	payment_id: z.string().optional(),
	square_payment_id: z.string().optional(),
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
		type Insert = Database['public']['Tables']['shipments']['Insert']
		const input = parsed.data
		const payload: Insert = {
			// TODO(org-removed): org_id deprecated
			created_by: userId as Insert['created_by'],
			user_id: userId as Insert['user_id'],
			tracking_number: input.tracking_number as Insert['tracking_number'],
			status: input.status as Insert['status'],
			label_url: input.label_url as Insert['label_url'],
			total_amount: input.total_amount as Insert['total_amount'],
			shipper_country: input.shipper_country as Insert['shipper_country'],
			payment_id: input.payment_id as Insert['payment_id'],
			square_payment_id: input.square_payment_id as Insert['square_payment_id'],
		}

		const { data, error } = await (supabase
			.from('shipments') as any)
			.insert(payload as any)
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


