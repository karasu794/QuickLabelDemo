import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  try {
    const supabase = createServiceRoleClient()
    
    // shipmentsテーブルから取引データを取得
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: shipment
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}