'use client'
import React from 'react'
import { CHARGE_LABELS } from '@/lib/labels/charges'

type Line = { key: keyof typeof CHARGE_LABELS, amount: number }

export default function BreakdownTable({ lines, currency }: { lines: Line[]; currency: string }) {
  const format = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  const order: (keyof typeof CHARGE_LABELS)[] = ['base', 'discount', 'fuel', 'peak', 'other', 'systemFee', 'vat']
  const sorted = order.map(k => ({ key: k, amount: lines.find(l => l.key === k)?.amount ?? 0 }))
  return (
    <div className="mt-4" data-test="breakdown-table">
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2">項目</th>
            <th className="text-right p-2">金額</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.key} data-test={`breakdown-row-${row.key}`}>
              <td className="p-2 border-t border-gray-200">{CHARGE_LABELS[row.key]}</td>
              <td className="p-2 border-t border-gray-200 text-right">{format(row.key === 'discount' ? -Math.abs(row.amount) : row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-500 mt-2">
        ※ 国際輸送費は消費税の課税対象外です。消費税はシステム利用料にのみ課税されます。
      </div>
    </div>
  )
}


