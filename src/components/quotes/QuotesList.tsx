"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { groupRatesByArrival, type RateRow } from '@/lib/rates/groupByArrival'

interface QuotesListProps {
  rates: RateRow[]
  shipDatestamp: string // YYYY-MM-DD
  quoteDateISO: string // 見積日 (ISO string)
  onSelectRate?: (rate: RateRow) => void
  DetailsBreakdown?: React.ComponentType<{ breakdown?: any }>
}

export default function QuotesList(props: QuotesListProps) {
  const rates = props.rates // 正規化済（transit含む）

  /* 到着日でグルーピング */
  const groups = groupRatesByArrival(rates, props.shipDatestamp, props.quoteDateISO)

  const DetailsBreakdown = props.DetailsBreakdown || (({ breakdown }: { breakdown?: any }) => (
    <div className="text-sm text-gray-600 mt-2">
      {breakdown ? JSON.stringify(breakdown, null, 2) : '明細なし'}
    </div>
  ))

  return (
    <div className="space-y-6">
      {groups.map(g => (
        <section key={g.key} className="mb-6">
          <header className="text-sm text-gray-600 mb-2 font-medium">{g.label}</header>
          <div className="space-y-3">
            {g.items.map((r, idx) => (
              <Card key={idx} className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">配達予定{r.transit?.deliveryTime ? ` ${r.transit.deliveryTime}` : ''}</div>
                      <div className="text-sm font-medium">{r.serviceType}</div>
                    </div>
                    <div className="text-xl font-bold">{r.currency} {r.amount.toLocaleString()}</div>
                  </div>
                  {/* 既存の明細折りたたみを流用 */}
                  <DetailsBreakdown breakdown={r.breakdown} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

