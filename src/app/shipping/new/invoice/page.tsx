import React from 'react'
import LetterheadSignatureSection from './LetterheadSignatureSection'
import { getAppSettingBoolean } from '@/lib/settings/getAppSettingBoolean'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default async function InvoicePage() {
  let forceLetterhead = await getAppSettingBoolean('FORCE_PHOENIX_LETTERHEAD', false)
  let forceSignature = await getAppSettingBoolean('FORCE_PHOENIX_SIGNATURE', false)

  // E2E override via cookie for stability (always honored when cookies are present)
  {
    const c = cookies()
    const e2eLh = c.get('E2E_FORCE_PHOENIX_LETTERHEAD')?.value
    const e2eSg = c.get('E2E_FORCE_PHOENIX_SIGNATURE')?.value
    if (typeof e2eLh === 'string') forceLetterhead = ['1','true','on','yes'].includes(e2eLh.toLowerCase())
    if (typeof e2eSg === 'string') forceSignature = ['1','true','on','yes'].includes(e2eSg.toLowerCase())
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let userLetterheads: Array<{ id: string; url: string; mime: string; owner_id?: string }> = []
  let userSignatures: Array<{ id: string; url: string; mime: string; owner_id?: string }> = []
  if (user) {
    const lh: any = await (supabase as any)
      .from('user_letterheads')
      .select('id, storage_url, content_type, owner_id')
      .eq('owner_id', user.id)
    userLetterheads = (lh?.data ?? []).map((r: any) => ({ id: r.id, url: r.storage_url, mime: r.content_type, owner_id: r.owner_id }))
    const sg: any = await (supabase as any)
      .from('user_signatures')
      .select('id, storage_url, content_type, owner_id')
      .eq('owner_id', user.id)
    userSignatures = (sg?.data ?? []).map((r: any) => ({ id: r.id, url: r.storage_url, mime: r.content_type, owner_id: r.owner_id }))
  }

  const initialExporterName = forceLetterhead || forceSignature ? 'Phoenix Co., Ltd. Norio Yamaguchi' : undefined

  return (
    <main className="p-6 space-y-8">
      <h2 className="text-xl font-semibold">Commercial Invoice</h2>
      <LetterheadSignatureSection
        forceLetterhead={forceLetterhead}
        forceSignature={forceSignature}
        userLetterheads={userLetterheads}
        userSignatures={userSignatures}
        initialExporterName={initialExporterName}
      />
    </main>
  )
}


