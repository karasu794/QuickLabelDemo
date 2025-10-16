import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import { toAsciiForShipping } from '@/lib/text/toAsciiForShipping'
// import type { Database } from '@/types/supabase'

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

    const { supabase, user } = await getUserOrThrow()
		const userId = user.id
		const orgId = null // TODO(org-removed)

    const body: AddressInput = parsed.data

    // ASCII 正規化フィールドを生成
    const asciiPayload = {
      contact_name_ascii: toAsciiForShipping(body.contact_name),
      company_name_ascii: toAsciiForShipping(body.company_name ?? ''),
      phone_number_ascii: toAsciiForShipping(body.phone_number ?? ''),
      country_code_ascii: toAsciiForShipping(body.country_code ?? ''),
      postal_code_ascii: toAsciiForShipping(body.postal_code ?? ''),
      state_code_ascii: toAsciiForShipping(body.state_code ?? ''),
      city_ascii: toAsciiForShipping(body.city ?? ''),
      address1_ascii: toAsciiForShipping(body.address1 ?? ''),
      address2_ascii: toAsciiForShipping(body.address2 ?? ''),
    }

		// サーバーが created_by を付与する（org_idは撤去）
    const insertPayload = {
			...body,
      ...asciiPayload,
			// TODO(org-removed): org_id deprecated
			created_by: userId,
		}

    const { data, error } = await supabase
      .from('address_book')
      .insert(insertPayload as any)
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
		const { supabase, user } = await getUserOrThrow()
		const who = user.id

    const q = supabase
      .from('address_book')
      .select('contact_name,company_name,phone_number,country_code,postal_code,state_code,city,address1,address2,contact_name_ascii,company_name_ascii,phone_number_ascii,country_code_ascii,postal_code_ascii,state_code_ascii,city_ascii,address1_ascii,address2_ascii,created_at,user_id,created_by', { count: 'exact' })
			.or(`user_id.eq.${who},created_by.eq.${who}`)
			.order('created_at', { ascending: false })
			.limit(50)

    const { data, error } = await q

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


