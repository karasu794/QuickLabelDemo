"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LabelCreatePage() {
  const router = useRouter()
  const [shipmentId, setShipmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState<string | null>(null)

  const backoffSeq = useMemo(() => [1000, 2000, 4000, 8000, 12000, 16000], [])
  const cancelledRef = useRef(false)

  const pollStatus = useCallback(async (id: string) => {
    for (let i = 0; i < backoffSeq.length; i++) {
      if (cancelledRef.current) return
      await new Promise(r => setTimeout(r, i === 0 ? 0 : backoffSeq[i]))
      try {
        const res = await fetch(`/api/ship/status?shipmentId=${encodeURIComponent(id)}`, { cache: 'no-store' })
        const j = await res.json()
        if (j?.status === 'completed' && j?.labelUrl) {
          setLabelUrl(String(j.labelUrl))
          setIsLoading(false)
          return
        }
        if (j?.status === 'failed') {
          setError(String(j?.error || '作成に失敗しました'))
          setIsLoading(false)
          return
        }
      } catch (e) {
        // continue
      }
    }
    // timeout
    setError('タイムアウトしました。しばらくしてから再試行してください。')
    setIsLoading(false)
  }, [backoffSeq])

  const handleSubmit = useCallback(async () => {
    setError(null)
    setLabelUrl(null)
    setIsLoading(true)
    try {
      // 最小ボディを localStorage + 既定値から構築（mock時フェイルオープン）
      let store: any = null
      try { store = JSON.parse(localStorage.getItem('shipping-form-storage') || '{}') } catch {}
      const state = store?.state || {}
      const orderId = `ord-${Date.now()}`
      const body: any = {
        orderId,
        serviceType: state?.selectedRate?.serviceType || 'FEDEX_INTERNATIONAL_PRIORITY',
        bill: { payer: 'SENDER' },
        shipper: {
          name: state?.shipperInfo?.contactName || 'Shipper', phone: state?.shipperInfo?.phoneNumber || '000',
          address1: state?.shipperInfo?.address1 || '1-1-1', address2: state?.shipperInfo?.address2 || '',
          city: state?.shipperInfo?.cityName || 'Tokyo', state: state?.shipperInfo?.stateCode || '',
          postalCode: state?.shipperInfo?.postalCode || '1000001', country: state?.shipperInfo?.countryCode || 'JP'
        },
        recipient: {
          name: state?.recipientInfo?.contactName || 'Recipient', phone: state?.recipientInfo?.phoneNumber || '000',
          address1: state?.recipientInfo?.address1 || '1st Ave', address2: state?.recipientInfo?.address2 || '',
          city: state?.recipientInfo?.cityName || 'Daly City', state: state?.recipientInfo?.stateCode || 'CA',
          postalCode: state?.recipientInfo?.postalCode || '94016', country: state?.recipientInfo?.countryCode || 'US'
        },
        packages: [
          {
            weight: { value: Number(state?.packages?.[0]?.weight || '1'), unit: 'KG' },
            dimensions: { length: Number(state?.packages?.[0]?.length || '10'), width: Number(state?.packages?.[0]?.width || '10'), height: Number(state?.packages?.[0]?.height || '10'), unit: 'CM' }
          }
        ],
        htsCode: state?.items?.[0]?.hsCode ? String(state?.items?.[0]?.hsCode) : undefined,
      }
      const res = await fetch('/api/ship/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || '作成に失敗しました')
      const id = String(j?.shipmentId || '')
      if (!id) throw new Error('SHIPMENT_ID_MISSING')
      setShipmentId(id)
      await pollStatus(id)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setIsLoading(false)
    }
  }, [pollStatus])

  useEffect(() => () => { cancelledRef.current = true }, [])

  return (
    <div className="container mx-auto max-w-xl">
      <div className="space-y-4">
        <Button data-test="label-create-submit" onClick={handleSubmit} disabled={isLoading}>ラベルを作成</Button>
        {isLoading && (
          <div data-test="label-spinner" className="text-sm text-gray-600">作成中...</div>
        )}
        {labelUrl && (
          <a data-test="label-download-link" href={labelUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">ラベルをダウンロード</a>
        )}
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  )
}
