import { NextRequest, NextResponse } from 'next/server'
import { getServiceFeePercentage } from '@/lib/settings/getServiceFeePercentage'

export async function GET(_req: NextRequest) {
  // 即時反映のためサーバキャッシュをバイパスし、CDNにもキャッシュさせない
  const pct = await getServiceFeePercentage({ bypassCache: true })
  return NextResponse.json(
    { serviceFeePercentage: pct },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}


