'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type RateContextValue = {
  jpyToUsd: number | null
  reload: () => Promise<void>
}

const RateContext = createContext<RateContextValue>({ jpyToUsd: null, reload: async () => {} })

export function useRateContext() {
  return useContext(RateContext)
}

export function RateProvider({ children }: { children: React.ReactNode }) {
  const [jpyToUsd, setJpyToUsd] = useState<number | null>(null)

  const load = async () => {
    try {
      const mod = await import('@/lib/services/exchangeRateService')
      const usdToJpy = await mod.ExchangeRateService.getExchangeRate()
      if (usdToJpy && usdToJpy > 0) setJpyToUsd(1 / usdToJpy)
    } catch {
      // フォールバック: 1/150
      setJpyToUsd(1 / 150)
    }
  }

  useEffect(() => { void load() }, [])

  const value = useMemo(() => ({ jpyToUsd, reload: load }), [jpyToUsd])

  return (
    <RateContext.Provider value={value}>
      {children}
    </RateContext.Provider>
  )
}


