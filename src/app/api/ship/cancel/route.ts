import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // TODO: Bブロックで本実装に差し替え
  return NextResponse.json({ error: 'NOT_IMPLEMENTED' }, { status: 404 })
}
