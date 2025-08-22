import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrg } from '@/lib/org'
import type { Database } from '@/types/supabase'

// org_id と created_by はサーバー側で自動付与する
// クライアントから受け取らないこと
const addressSchema = z.object({
	contact_name: z.string().min(1),
	company_name: z.string().optional().nullable(),
	phone_number: z.string().optional().nullable(),
	country_code: z.string().min(2).max(2),
	postal_code: z.string().optional().nullable(),
	state_code: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	address1: z.string().optional().nullable(),
	address2: z.string().optional().nullable(),
})

type AddressInput = z.infer<typeof addressSchema>

export async function POST(request: NextRequest) {
	try {
		let raw: unknown
		try {
			raw = await request.json()
		} catch {
			return NextResponse.json({ code: 'QL-JSON', message: '無効なJSONです' }, { status: 400 })
		}

		const parsed = addressSchema.safeParse(raw)
		if (!parsed.success) {
			return NextResponse.json({ code: 'QL-VALIDATION', message: '入力値が不正です' }, { status: 400 })
		}

		const { supabase, userId, orgId } = await requireOrg()

		const body: AddressInput = parsed.data

		// サーバーが org_id / created_by を上書き付与する
		const insertPayload = {
			...body,
			org_id: orgId,
			created_by: userId,
		}

		const { data, error } = await supabase
			.from('address_book')
			.insert(
				insertPayload as unknown as Database['public']['Tables']['address_book']['Insert']
			)
			.select()
			.single()

		if (error) {
			return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
		}

		return NextResponse.json(data, { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}

export async function GET() {
	try {
		const { supabase, orgId } = await requireOrg()

		const { data, error } = await supabase
			.from('address_book')
			.select('*')
			.filter('org_id', 'eq', orgId)
			.order('created_at', { ascending: false })

		if (error) {
			return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
		}

		return NextResponse.json(data ?? [], { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
	return (
		typeof e === 'object' && e !== null &&
		'status' in e && 'code' in e && 'message' in e
	)
}


