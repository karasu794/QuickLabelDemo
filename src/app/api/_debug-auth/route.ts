import { NextResponse } from 'next/server'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'

export async function GET() {
  try {
    const { user } = await getUserOrThrow()
    const userId = user.id
    const orgId = null // TODO(org-removed)
    return NextResponse.json({ ok: true, userId, orgId }, { status: 200 })
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


