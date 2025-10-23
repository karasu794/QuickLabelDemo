import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'admin-assets'
const FOLDER = 'letterheads'
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']

async function isAdminServer(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase
      .from('profiles')
      .select('role,is_admin')
      .eq('id', user.id)
      .maybeSingle()
    const p: any = profile || {}
    const roleNormalized = String(p.role ?? '').trim().toLowerCase()
    return p.is_admin === true || roleNormalized === 'admin'
  } catch {
    return false
  }
}

function getMaxBytes(): number {
  const v = process.env.ASSET_MAX_BYTES
  if (!v) return 2 * 1024 * 1024
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 2 * 1024 * 1024
}

export async function GET() {
  if (!(await isAdminServer())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    // TODO(stage5): Database types に admin_assets_letterhead を追加し、from を厳密型に戻す
    .from('admin_assets_letterhead')
    .select('id, storage_url, content_type, file_name, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] }, { status: 200 })
}

export async function POST(req: Request) {
  if (!(await isAdminServer())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = createClient()
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'bad_request', code: 'NO_FILE' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'bad_request', code: 'BAD_MIME' }, { status: 400 })
  if (file.size > getMaxBytes()) return NextResponse.json({ error: 'bad_request', code: 'TOO_LARGE' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const key = `${FOLDER}/${randomUUID()}_${file.name}`
  const arrayBuf = await file.arrayBuffer()
  const { error: upErr } = await (supabase as any).storage
    .from(BUCKET)
    .upload(key, Buffer.from(arrayBuf), { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: 'upload_failed', detail: upErr.message }, { status: 500 })

  const { data: pub } = (supabase as any).storage.from(BUCKET).getPublicUrl(key)
  const storage_url: string = pub?.publicUrl || ''

  // TODO(types): migrate to generated types
  const insertRes: any = await (supabase as any)
    .from('admin_assets_letterhead')
    .insert({ storage_url, file_name: file.name, content_type: file.type, uploaded_by: user.id })
    .select('id, storage_url, content_type')
    .single()
  const data = insertRes?.data
  const error = insertRes?.error
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json({ id: data.id, url: data.storage_url, mime: data.content_type }, { status: 200 })
}

export async function DELETE(req: Request) {
  if (!(await isAdminServer())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'bad_request', code: 'NO_ID' }, { status: 400 })
  const supabase = createClient()
  const { error } = await (supabase as any)
    // TODO(stage5): Database types に admin_assets_letterhead を追加し、from を厳密型に戻す
    .from('admin_assets_letterhead')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 200 })
}


