"use client"

import React, { useEffect, useState, useCallback } from 'react'
import FedExQuoteResults, { type FedExRate } from '@/components/FedExQuoteResults'

/**
 * Pure props-driven quote picker. Pass `rates` from caller (top or service step).
 */
interface QuotePickerSharedProps {
  // 直接表示モード: そのまま描画するレート群
  rates?: FedExRate[]
  isLoading?: boolean
  error?: string
  accountType?: 'export' | 'import'
  // 直接表示モード: レート選択時に呼ばれる
  onSelectRate?: (rate: FedExRate) => void
}

export default function QuotePickerShared({ accountType, rates: propRates, isLoading: propLoading, error: propError, onSelectRate }: QuotePickerSharedProps) {
  const [rates, setRates] = useState<FedExRate[]>(propRates || [])
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(propLoading))
  const [error, setError] = useState<string | undefined>(propError)

useEffect(() => {
  if (propRates && propRates.length > 0) {
    setRates(propRates)
    setIsLoading(Boolean(propLoading))
    setError(propError)
  } else {
    setRates([] as any)
    setIsLoading(Boolean(propLoading))
    setError(propError)
  }
}, [propRates, propLoading, propError])

  const handleSelect = useCallback((rate: FedExRate) => {
    onSelectRate?.(rate)
  }, [onSelectRate])

  return (
    <div data-test="quote-container">
      <FedExQuoteResults
        rates={rates}
        isLoading={isLoading}
        error={error}
        isUserLoggedIn={true}
        onSelectRate={handleSelect}
        accountType={accountType}
      />
      {error && (
        <div className="mt-4 text-sm text-red-700" data-test="quote-error">{error}</div>
      )}
    </div>
  )
}


