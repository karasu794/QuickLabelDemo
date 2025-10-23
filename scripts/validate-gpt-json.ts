#!/usr/bin/env ts-node
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { z } from 'zod'
import { SpecWriterSchema } from '../src/schemas/specwriter.schema'
import { LogDoctorSchema } from '../src/schemas/logdoctor.schema'

function printUsage() {
  console.log('Usage: npm run validate:gpt <path-to-json> [--kind=specwriter|logdoctor]')
}

function detectKind(obj: any): 'specwriter'|'logdoctor'|null {
  if (obj && typeof obj === 'object') {
    if ('files' in obj || 'diffs' in obj || 'tests' in obj || 'manualQA' in obj) return 'specwriter'
    if ('summary' in obj || 'retest' in obj) return 'logdoctor'
  }
  return null
}

function main() {
  const args = process.argv.slice(2)
  if (args.length < 1) { printUsage(); process.exit(1) }
  const file = resolve(process.cwd(), args[0])
  const kindArg = args.find(a => a.startsWith('--kind='))
  const kind = kindArg ? (kindArg.split('=')[1] as 'specwriter'|'logdoctor') : undefined

  const raw = readFileSync(file, 'utf8')
  const json = JSON.parse(raw)

  const k = kind || detectKind(json)
  if (!k) { console.error('Unable to detect kind. Pass --kind=specwriter|logdoctor'); process.exit(2) }

  let schema: z.ZodTypeAny
  if (k === 'specwriter') schema = SpecWriterSchema
  else schema = LogDoctorSchema

  const out = schema.safeParse(json)
  if (!out.success) {
    console.error('Invalid:', JSON.stringify(out.error.issues, null, 2))
    process.exit(3)
  }
  console.log('OK:', k)
}

main()
