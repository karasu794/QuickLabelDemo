import { NextRequest, NextResponse } from 'next/server'
import { requireOrg } from '@/lib/org'
import type { Database } from '@/types/supabase'

// (unused legacy helper removed)
type NotificationRow = Database['public']['Tables']['notifications']['Row']

// GETリクエスト: 全ての通知を新しい順に取得
export async function GET() {
  try {
    const { supabase, orgId } = await requireOrg()

    const { data, error } = await supabase
      .from('notifications')
      .select('id,type,message,is_read,read_at,updated_at,org_id,target_user_id,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ code: 'QL-DB', message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: data as NotificationRow[] }, { status: 200 })
  } catch (e: unknown) {
    return NextResponse.json({ code: 'QL-UNEXPECTED', message: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// PUTリクエスト: 通知を既読にする
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body

    // バリデーション
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: '通知IDが必要です' },
        { status: 400 }
      )
    }

    if (action !== 'mark_as_read') {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      )
    }

    const { supabase, userId, orgId } = await requireOrg()
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json(
        { error: '無効な通知IDです' },
        { status: 400 }
      )
    }

    // 通知を既読に更新
    const { data, error } = await (supabase as any)
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', idNum)
      .eq('target_user_id', userId)
      .eq('org_id', orgId)
      .select('*')
      .single()

    if (error) {
      console.error('通知更新エラー:', error)
      return NextResponse.json(
        { error: '通知の更新に失敗しました' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '指定された通知が見つかりません' },
        { status: 404 }
      )
    }

    console.log(`通知を既読にしました: ${id}`)

    return NextResponse.json({
      success: true,
      message: '通知を既読にしました',
      notification: data
    })

  } catch (error) {
    console.error('通知更新エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POSTリクエスト: 新しい通知を作成（システム内部用）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, message, metadata } = body

    // バリデーション
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: '通知タイプが必要です' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      )
    }

    const { supabase, orgId } = await requireOrg()

    // 新しい通知を作成
    const { data, error } = await (supabase as any)
      .from('notifications')
      .insert({
        type: type,
        message: message,
        is_read: false,
        org_id: orgId,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('通知作成エラー:', error)
      return NextResponse.json(
        { error: '通知の作成に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`新しい通知を作成しました: ${type} - ${message}`)

    return NextResponse.json({
      success: true,
      message: '通知を作成しました',
      notification: data
    }, { status: 201 })

  } catch (error) {
    console.error('通知作成エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETEリクエスト: 通知を削除（管理者用）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '通知IDが必要です' },
        { status: 400 }
      )
    }

    const { supabase, orgId } = await requireOrg()
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json(
        { error: '無効な通知IDです' },
        { status: 400 }
      )
    }

    // 通知を削除
    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', idNum)
      .eq('org_id', orgId)

    if (error) {
      console.error('通知削除エラー:', error)
      return NextResponse.json(
        { error: '通知の削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`通知を削除しました: ${id}`)

    return NextResponse.json({
      success: true,
      message: '通知を削除しました'
    })

  } catch (error) {
    console.error('通知削除エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 