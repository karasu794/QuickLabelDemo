"use client"

import { useMemo } from 'react'
import { toAsciiForShipping } from '@/lib/text/toAsciiForShipping'

type Props = {
  label: string
  jpValue: string
  maxLength?: number
  testId?: string
}

export default function AsciiPreviewField({ label, jpValue, maxLength = 128, testId }: Props) {
  const ascii = useMemo(() => toAsciiForShipping(jpValue || '', { maxLength }), [jpValue, maxLength])
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label} (ASCII)</label>
      <input
        type="text"
        readOnly
        value={ascii}
        className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-700"
        data-test={testId}
      />
    </div>
  )
}


