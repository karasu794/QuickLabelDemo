// ensurePost: POST以外は405で返す最小ユーティリティ
import { NextRequest, NextResponse } from 'next/server'

export function ensurePost(req: NextRequest) {
  // MW-REMOVED: middleware撤去に伴い、API内で最小責務を実施
  if (req.method !== 'POST') {
    return NextResponse.json({ code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, { status: 405 })
  }
  return null
}


