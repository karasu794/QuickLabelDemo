'use client'

import React from 'react'
import type { Money } from '@/types/money'

export function AmountRow({ label, money }: { label: string; money: Money }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium">{money.currency} {money.amount.toLocaleString('ja-JP')}</span>
    </div>
  )
}


