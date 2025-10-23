import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonErr, jsonOk } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ParamsSchema = z.object({ jobId: z.string().min(1) }).strict()
const ResponseSchema = z.object({ jobId: z.string(), status: z.enum(['queued','running','passed','failed']) }).strict()

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const parse = ParamsSchema.safeParse(params)
  if (!parse.success) return jsonErr(422, { error: 'validation_error', issues: parse.error.issues })

  const body = { jobId: parse.data.jobId, status: 'queued' as const }
  const out = ResponseSchema.safeParse(body)
  if (!out.success) return jsonErr(500, { error: 'schema_mismatch', issues: out.error.issues })
  return jsonOk<typeof body>(body)
}


