import { NextResponse } from 'next/server'
import { getServiceFeePercentage } from '@/lib/settings/getServiceFeePercentage'

export async function GET() {
  const pct = await getServiceFeePercentage()
  return NextResponse.json({ serviceFeePercentage: pct }, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
    }
  })
}


