'use client'
import React from 'react'
import type { InvoiceOptions } from '@/types/invoice'

export default function InvoiceOptionsForm({ value, onChange }: { value: InvoiceOptions; onChange: (v: InvoiceOptions) => void }) {
  const toggle = (k: keyof InvoiceOptions) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.checked })
  const set = (k: keyof InvoiceOptions) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value } as any)

  return (
    <div className="space-y-3" data-test="invoice-options">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={value.generateCommercialInvoice} onChange={toggle('generateCommercialInvoice')} />
        <span>商業インボイスを生成</span>
      </label>
      <div>
        <label className="block text-sm text-gray-700">既存インボイスPDF（URL）</label>
        <input className="mt-1 w-full border p-2" type="url" value={value.attachExistingInvoicePdf || ''} onChange={set('attachExistingInvoicePdf')} placeholder="https://..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-700">申告通貨（ISO-4217）</label>
          <input className="mt-1 w-full border p-2" value={value.declareCurrency} onChange={set('declareCurrency')} placeholder="USD" />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Incoterms</label>
          <select className="mt-1 w-full border p-2" value={value.incoterms || ''} onChange={set('incoterms')}>
            <option value="">未指定</option>
            <option value="DAP">DAP</option>
            <option value="DDP">DDP</option>
            <option value="EXW">EXW</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Duties/Taxesの請求先</label>
          <select className="mt-1 w-full border p-2" value={value.dutiesPayer || ''} onChange={set('dutiesPayer')}>
            <option value="">未指定</option>
            <option value="Shipper">Shipper</option>
            <option value="Recipient">Recipient</option>
            <option value="Third-Party">Third-Party</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={value.printHSHTS} onChange={toggle('printHSHTS')} />
          <span>HS/HTSコードを印字</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={value.printOriginCountry} onChange={toggle('printOriginCountry')} />
          <span>原産国を印字</span>
        </label>
      </div>
    </div>
  )
}


