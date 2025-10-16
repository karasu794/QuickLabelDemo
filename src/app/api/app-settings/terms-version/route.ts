import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTermsVersion } from '@/lib/settings/getCurrentTermsVersion'

export async function GET(_req: NextRequest) {
  const ver = await getCurrentTermsVersion({ bypassCache: true })
  return NextResponse.json({ termsVersion: ver }, { headers: { 'Cache-Control': 'no-store' } })
}


