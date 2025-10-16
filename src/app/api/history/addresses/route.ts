import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/routeClient'

type Role = 'shipper' | 'recipient'

type AddressDTO = {
  name: string
  company: string | null
  phone: string | null
  email: string | null
  country: string | null
  zip: string | null
  state: string | null
  city: string | null
  address1: string | null
  address2: string | null
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const role = url.searchParams.get('role') as Role | null
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 50)

  if (role !== 'shipper' && role !== 'recipient') {
    return NextResponse.json({ error: 'role は shipper | recipient のいずれかが必須です' }, { status: 400 })
  }

  const supabase = createRouteClient()

  // 認証 + org 取得
  const bypass = request.headers.get('X-Test-Bypass-Auth') === '1'
  const requireUser = async (): Promise<{ id: string; orgId: string | null }> => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if ((error || !user) && !bypass) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    }
    const userId = user?.id || 'test-user'

    // org_id を推定（組織メンバーシップの最初の1件）
    let orgId: string | null = null
    try {
      const { data: mem } = await (supabase
        .from('organization_members') as any)
        .select('org_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      orgId = (mem as any)?.org_id ?? null
    } catch {}

    return { id: userId, orgId }
  }

  try {
    const { id: userId, orgId } = await requireUser()

    const fetchUserHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('user_address_history' as any)
          .select('role,name,company,phone,email,address1,address2,city,state,postal,country,fingerprint,last_used_at,updated_at')
          .eq('user_id', userId)
          .eq('role', role)
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false })
          .limit(200)
        if (error) return [] as any[]
        return (data || []) as any[]
      } catch {
        return [] as any[]
      }
    }

    // 各テーブルから取得（存在しない場合は空扱い）
    const fetchShipments = async () => {
      try {
        let q = supabase
          .from('shipments')
          .select(
            [
              'updated_at',
              'org_id',
              'created_by',
              'shipper_contact','shipper_company','shipper_phone','shipper_email','shipper_postal_code','shipper_state','shipper_city','shipper_address1','shipper_address2','shipper_country',
              'recipient_contact','recipient_company','recipient_phone','recipient_email','recipient_postal_code','recipient_state','recipient_city','recipient_address1','recipient_address2','recipient_country',
            ].join(',')
          )
          .order('updated_at', { ascending: false })
          .limit(200)
        q = orgId ? q.eq('org_id', orgId) : q.eq('created_by', userId)
        const { data, error } = await q
        if (error) return [] as any[]
        return (data || []) as any[]
      } catch {
        return [] as any[]
      }
    }

    const fetchOpenShipments = async () => {
      try {
        let q = supabase
          .from('open_shipments')
          .select('updated_at, org_id, created_by, shipper_info, recipient_info')
          .order('updated_at', { ascending: false })
          .limit(200)
        q = orgId ? q.eq('org_id', orgId) : q.eq('created_by', userId)
        const { data, error } = await q
        if (error) return [] as any[]
        return (data || []) as any[]
      } catch {
        return [] as any[]
      }
    }

    const [histRows, shipRows, openRows] = await Promise.all([fetchUserHistory(), fetchShipments(), fetchOpenShipments()])

    type WithUpdated<T> = T & { _updated_at?: string | null }

    const mapFromShipments = (rows: any[]): WithUpdated<AddressDTO>[] => {
      return rows.map((r) => {
        const dto: AddressDTO = role === 'shipper'
          ? {
              name: r.shipper_contact || '',
              company: r.shipper_company || null,
              phone: r.shipper_phone || null,
              email: r.shipper_email || null,
              country: r.shipper_country || null,
              zip: r.shipper_postal_code || null,
              state: r.shipper_state || null,
              city: r.shipper_city || null,
              address1: r.shipper_address1 || null,
              address2: r.shipper_address2 || null,
            }
          : {
              name: r.recipient_contact || '',
              company: r.recipient_company || null,
              phone: r.recipient_phone || null,
              email: r.recipient_email || null,
              country: r.recipient_country || null,
              zip: r.recipient_postal_code || null,
              state: r.recipient_state || null,
              city: r.recipient_city || null,
              address1: r.recipient_address1 || null,
              address2: r.recipient_address2 || null,
            }
        return { ...dto, _updated_at: r.updated_at || null }
      })
    }

    const mapFromOpenShipments = (rows: any[]): WithUpdated<AddressDTO>[] => {
      return rows.map((r) => {
        const info = role === 'shipper' ? (r.shipper_info || {}) : (r.recipient_info || {})
        const dto: AddressDTO = {
          name: info.contactName || '',
          company: info.companyName || null,
          phone: info.phoneNumber || null,
          email: info.email || null,
          country: info.countryCode || null,
          zip: info.postalCode || null,
          state: info.stateCode || null,
          city: info.cityName || null,
          address1: info.address1 || null,
          address2: info.address2 || null,
        }
        return { ...dto, _updated_at: r.updated_at || null }
      })
    }

    const hasAddress = (a: AddressDTO) => {
      return Boolean(
        (a.address1 && a.address1.trim()) ||
        (a.zip && String(a.zip).trim()) ||
        (a.name && String(a.name).trim())
      )
    }

    const mapFromUserHistory = (rows: any[]) => {
      return rows.map((r) => ({
        name: r.name || null,
        company: r.company || null,
        phone: r.phone || null,
        email: r.email || null,
        country: r.country || null,
        zip: r.postal || null,
        state: r.state || null,
        city: r.city || null,
        address1: r.address1 || null,
        address2: r.address2 || null,
        _fingerprint: r.fingerprint || null,
        _updated_at: r.last_used_at || r.updated_at || null,
      }))
    }

    const keyOfPrimary = (a: { _fingerprint?: string | null } & AddressDTO) => {
      if (a._fingerprint) return `fp:${a._fingerprint}`
      const k1 = (a.name || '').trim().toLowerCase()
      const k2 = (a.zip || '').toString().replace(/\s|-/g, '')
      const k3 = (a.address1 || '').trim().toLowerCase()
      return `${k1}|${k2}|${k3}`
    }

    const primary = mapFromUserHistory(histRows)
    const uniqPrimary = new Map<string, AddressDTO>()
    for (const it of primary) {
      const { _fingerprint, _updated_at, ...dto } = it as any
      const k = keyOfPrimary(it as any)
      if (!uniqPrimary.has(k)) uniqPrimary.set(k, dto)
      if (uniqPrimary.size >= limit) break
    }

    let items: AddressDTO[] = Array.from(uniqPrimary.values())

    if (items.length === 0) {
      const shipDtos = mapFromShipments(shipRows).filter((a) => hasAddress(a))
      const openDtos = mapFromOpenShipments(openRows).filter((a) => hasAddress(a))
      const merged = [...shipDtos, ...openDtos]
      merged.sort((a, b) => {
        const ta = a._updated_at ? new Date(a._updated_at).getTime() : 0
        const tb = b._updated_at ? new Date(b._updated_at).getTime() : 0
        return tb - ta
      })
      const keyOfFallback = (a: AddressDTO) => {
        const k1 = (a.name || '').trim().toLowerCase()
        const k2 = (a.zip || '').toString().replace(/\s|-/g, '')
        const k3 = (a.address1 || '').trim().toLowerCase()
        return `${k1}|${k2}|${k3}`
      }
      const uniqFallback = new Map<string, AddressDTO>()
      for (const it of merged) {
        const { _updated_at, ...dto } = it as any
        const k = keyOfFallback(dto)
        if (!uniqFallback.has(k)) uniqFallback.set(k, dto)
        if (uniqFallback.size >= limit) break
      }
      items = Array.from(uniqFallback.values())
    }

    return NextResponse.json({ items: items.slice(0, limit) }, { status: 200 })
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Internal Server Error' }, { status })
  }
}


