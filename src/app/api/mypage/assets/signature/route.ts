import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'

const BUCKET = 'user-assets'
const FOLDER = 'signatures'
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']

function getMaxBytes(): number {
  const v = process.env.ASSET_MAX_BYTES
  if (!v) return 2 * 1024 * 1024
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 2 * 1024 * 1024
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('user_signatures' as any)
    .select('id, storage_url, content_type, owner_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false } as any)
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 })
  const items = (data ?? []).map((r: any) => ({ id: r.id, url: r.storage_url, mime: r.content_type, owner_id: r.owner_id }))
  return NextResponse.json({ items }, { status: 200 })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'bad_request', code: 'NO_FILE' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'bad_request', code: 'BAD_MIME' }, { status: 400 })
  if (file.size > getMaxBytes()) return NextResponse.json({ error: 'bad_request', code: 'TOO_LARGE' }, { status: 400 })

  const key = `${user.id}/${FOLDER}/${randomUUID()}_${file.name}`
  const arrayBuf = await file.arrayBuffer()
  const { error: upErr } = await (supabase as any).storage
    .from(BUCKET)
    .upload(key, Buffer.from(arrayBuf), { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: 'upload_failed', detail: upErr.message }, { status: 500 })
  const { data: pub } = (supabase as any).storage.from(BUCKET).getPublicUrl(key)
  const storage_url: string = pub?.publicUrl || ''

  // TODO(types): migrate to generated types
  const ins: any = await (supabase as any)
    .from('user_signatures')
    .insert({ storage_url, file_name: file.name, content_type: file.type, owner_id: user.id })
    .select('id, storage_url, content_type, owner_id')
    .single()
  if (ins?.error) return NextResponse.json({ error: 'db_error', detail: ins.error.message }, { status: 500 })
  const row = ins?.data
  if (!row) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json({ id: row.id, url: row.storage_url, mime: row.content_type, owner_id: row.owner_id }, { status: 200 })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'bad_request', code: 'NO_ID' }, { status: 400 })

  // best-effort: fetch row to attempt storage delete
  const found: any = await (supabase as any)
    .from('user_signatures')
    .select('storage_url, owner_id')
    .eq('id', id)
    .maybeSingle()
  const storageUrl: string | undefined = found?.data?.storage_url

  const delRes = await (supabase as any)
    .from('user_signatures')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)
  if (delRes?.error) return NextResponse.json({ error: 'db_error', detail: delRes.error.message }, { status: 500 })

  if (storageUrl) {
    try {
      const u = new URL(storageUrl)
      const parts = u.pathname.split('/object/public/')
      if (parts[1]) {
        const pathPart = parts[1].split('/')
        const key = pathPart.slice(1).join('/')
        await (supabase as any).storage.from(BUCKET).remove([key])
      }
    } catch {
      // ignore
    }
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}


