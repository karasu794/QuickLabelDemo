import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('[API] Checking admin status for user:', userId)

    // Service Role Keyを使用してプロフィールを取得
    const supabase = createServiceRoleClient()
    const startTime = Date.now()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const endTime = Date.now()
    console.log('[API] Profile query completed in:', endTime - startTime, 'ms')

    if (error) {
      console.error('[API] Profile query error:', error)
      return NextResponse.json(
        { 
          error: 'Profile query failed', 
          details: error,
          isAdmin: false
        },
        { status: 500 }
      )
    }

    const isAdmin = profile?.role === 'admin'
    console.log('[API] Profile data:', profile)
    console.log('[API] Admin check result:', isAdmin)

    return NextResponse.json({
      isAdmin,
      profile,
      success: true
    })

  } catch (error) {
    console.error('[API] Check admin error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        isAdmin: false
      },
      { status: 500 }
    )
  }
}