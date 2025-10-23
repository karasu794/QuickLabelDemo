import { z } from 'zod'

export const DebugReportSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  summary: z.string().min(1),
  status: z.union([z.literal('error'), z.literal('fixed'), z.literal('running')]),
  fixDiffs: z.array(z.string().min(1)).default([]),
  retestUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
}).strict()


