import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export function getServerSupabase() {
	return createRouteHandlerClient<Database>({ cookies })
}

type KnownError = { status: number; code: string; message: string }

export async function requireOrg(): Promise<{ supabase: ReturnType<typeof getServerSupabase>; userId: string; orgId: string }> {
	const supabase = getServerSupabase()
	const { data: { user }, error: userErr } = await supabase.auth.getUser()

	if (userErr || !user) {
		const err: KnownError = { status: 401, code: 'QL-AUTH', message: 'ログインが必要です' }
		throw err
	}

	const { data: mem, error: memErr } = await (supabase
		.from('organization_members') as any)
		.select('org_id')
		.eq('user_id', user.id as any)
		.limit(1)
		.maybeSingle()

	if (memErr || !mem) {
		const err: KnownError = { status: 403, code: 'QL-ORG', message: '所属組織が見つかりません' }
		throw err
	}

	return { supabase, userId: user.id, orgId: (mem as { org_id: string }).org_id }
}

export type RequireOrgResult = Awaited<ReturnType<typeof requireOrg>>


