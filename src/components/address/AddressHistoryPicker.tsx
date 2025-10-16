'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type AddressDTO = {
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

type Props = {
  role: 'shipper' | 'recipient'
  onSelect: (addr: AddressDTO) => void
  onClose: () => void
}

export default function AddressHistoryPicker({ role, onSelect, onClose }: Props) {
  const [items, setItems] = useState<AddressDTO[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/history/addresses?role=${role}` , { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 401) {
            toast.error('ログインが必要です')
            throw new Error('ログインが必要です')
          }
          throw new Error(`Failed to load history: ${res.status}`)
        }
        const data = await res.json()
        if (!canceled) setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e: any) {
        if (!canceled) setError(e?.message || '読み込みに失敗しました')
      }
    })()
    return () => {
      canceled = true
    }
  }, [role])

  const filtered = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const hay = [it.name, it.zip, it.address1, it.city, it.company]
        .filter(Boolean)
        .join(' ') 
        .toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  // Esc キーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-test="modal-history-picker"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <Card className="relative z-10 w-[90vw] max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">履歴から入力</CardTitle>
            <Button variant="outline" size="sm" onClick={onClose}>閉じる</Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <Input
            placeholder="氏名・郵便番号・住所で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {items && items.length === 0 && !error && (
            <div className="text-sm text-gray-600" data-test="empty-history">過去の出荷履歴が見つかりません</div>
          )}

          <div className="divide-y border rounded overflow-auto max-h-[48vh]">
            {filtered.map((it, idx) => (
              <div key={idx} className="p-3 flex items-start justify-between gap-3 hover:bg-gray-50">
                <div className="text-sm">
                  <div className="font-medium">{it.name}{it.company ? ` / ${it.company}` : ''}</div>
                  <div className="text-gray-600">
                    {it.zip ? `${it.zip} ` : ''}{it.state ? `${it.state} ` : ''}{it.city ? `${it.city} ` : ''}{it.address1 || ''}{it.address2 ? ` ${it.address2}` : ''}
                  </div>
                  <div className="text-gray-500">
                    {it.phone || ''}{it.email ? ` / ${it.email}` : ''}
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    onClick={() => onSelect(it)}
                  >この住所を使う</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


