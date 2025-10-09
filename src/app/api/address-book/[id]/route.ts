import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import type { Database } from '@/types/supabase'

type KnownError = { status: number; code: string; message: string }
function isKnownError(e: unknown): e is KnownError {
	return typeof e === 'object' && e !== null && 'status' in e && 'code' in e && 'message' in e
}

const baseUpdateSchema = z.object({
	contact_name: z.string().min(1),
	company_name: z.string().nullable(),
	phone_number: z.string().nullable(),
	country_code: z.string().min(2).max(2),
	postal_code: z.string().nullable(),
	state_code: z.string().nullable(),
	city: z.string().nullable(),
	address1: z.string().nullable(),
	address2: z.string().nullable(),
})

const updateSchema = baseUpdateSchema.partial()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const { id } = params
		if (!id) {
			return NextResponse.json({ code: 'QL-INPUT', message: 'idが指定されていません' }, { status: 400 })
		}

		let raw: unknown
		try {
			raw = await request.json()
		} catch {
			return NextResponse.json({ code: 'QL-JSON', message: '無効なJSONです' }, { status: 400 })
		}

		const parsed = updateSchema.safeParse(raw)
		if (!parsed.success) {
			return NextResponse.json({ code: 'QL-VALIDATION', message: '入力値が不正です' }, { status: 400 })
		}

		const updateInput = parsed.data
		if (Object.keys(updateInput).length === 0) {
			return NextResponse.json({ code: 'QL-EMPTY', message: '更新フィールドが空です' }, { status: 400 })
		}

		const { supabase } = await getUserOrThrow()
		// Supabase の型推論が .update(...) の引数で never になるのを回避
		type Update = Database['public']['Tables']['address_book']['Update']
		const payload = updateInput as Partial<Update>

		const { data, error } = await (supabase
			.from('address_book') as any)
			.update(payload)
			.match({ id })
			.eq('org_id', orgId)
			.select('*')
			.maybeSingle()

		if (error) {
			const code = error.code === 'PGRST116' ? 404 : 500
			return NextResponse.json({ code: code === 404 ? 'NOT_FOUND' : 'QL-DB', message: error.message }, { status: code })
		}

		if (!data) {
			return NextResponse.json({ code: 'NOT_FOUND', message: 'Address not found' }, { status: 404 })
		}

		return NextResponse.json({ ok: true, data }, { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const { id } = params
		if (!id) {
			return NextResponse.json({ code: 'QL-INPUT', message: 'idが指定されていません' }, { status: 400 })
		}

		const { supabase } = await getUserOrThrow()

		const { data, error } = await supabase
			.from('address_book')
			.delete()
			.match({ id })
			-- TODO(org-removed): org filter removed
			.select('*')
			.maybeSingle()

		if (error) {
			const code = error.code === 'PGRST116' ? 404 : 500
			return NextResponse.json({ code: code === 404 ? 'NOT_FOUND' : 'QL-DB', message: error.message }, { status: code })
		}

		if (!data) {
			return NextResponse.json({ code: 'NOT_FOUND', message: 'Address not found' }, { status: 404 })
		}

		return NextResponse.json({ ok: true, data }, { status: 200 })
	} catch (e: unknown) {
		if (isKnownError(e)) {
			return NextResponse.json({ code: e.code, message: e.message }, { status: e.status })
		}
		return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
	}
}


