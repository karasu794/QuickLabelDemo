import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonErr, jsonOk } from '@/lib/http'
import { validateOrThrow } from '@/lib/validate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  suite: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
}).strict()

const ResponseSchema = z.object({ jobId: z.string() }).strict()

export async function POST(req: NextRequest) {
  let input: z.infer<typeof RequestSchema>
  try {
    input = validateOrThrow(RequestSchema, await req.json())
  } catch (e: any) {
    let issues: unknown = [{ message: String(e?.message ?? e) }]
    try { issues = JSON.parse(String(e?.message)) } catch {}
    return jsonErr(422, { error: 'validation_error', issues })
  }

  const jobId = `job_${Date.now()}`
  const body = { jobId }
  const out = ResponseSchema.safeParse(body)
  if (!out.success) return jsonErr(500, { error: 'schema_mismatch', issues: out.error.issues })
  return jsonOk<typeof body>(body)
}


