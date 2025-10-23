'use client'
import React from 'react'
import { DebugReportSchema } from '@schemas/debug-report.schema'
import { isValid } from '@lib/validate'

type AnyJson = Record<string, unknown>

export default function DebugPage() {
  const [input, setInput] = React.useState<string>('[]')
  let parsed: AnyJson | AnyJson[] | null = null
  let ok = false
  try {
    parsed = JSON.parse(input)
    ok = Array.isArray(parsed) && (parsed as AnyJson[]).every((x) => isValid(DebugReportSchema, x))
  } catch {
    parsed = null
  }
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">Debug Reports</h1>
      <textarea className="w-full border p-2 h-40" value={input} onChange={(e) => setInput(e.target.value)} />
      {!ok && <div className="text-yellow-700">開発者向け: Schema mismatch</div>}
      {ok && (
        <ul className="list-disc pl-5">
          {((parsed as AnyJson[]) || []).map((r, i) => (
            <li key={i}>{String((r as any).summary)} ({String((r as any).status)})</li>
          ))}
        </ul>
      )}
    </div>
  )
}


