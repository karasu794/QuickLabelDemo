import { z } from 'zod'
import { CodeDiffSchema } from './specwriter.schema'

export const RootCauseSchema = z.object({
  code: z.string().min(1),
  category: z.union([z.literal('ExternalAPI'), z.literal('Database'), z.literal('App'), z.literal('Config'), z.string()]),
  description: z.string().min(1),
}).strict()

export const EvidenceSchema = z.object({
  type: z.union([z.literal('log'), z.literal('api'), z.literal('test'), z.literal('metric')]),
  source: z.string().min(1),
  snippet: z.string().min(1),
}).strict()

export const RetestPlanSchema = z.object({
  steps: z.array(z.string().min(1)).min(1),
  triggers: z.array(z.string().min(1)).optional(),
}).strict()

export const LogDoctorSchema = z.object({
  summary: z.string().min(1),
  rootCauses: z.array(RootCauseSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  fixDiffs: z.array(CodeDiffSchema).default([]),
  retest: RetestPlanSchema,
  questions: z.array(z.string().min(1)).optional(),
}).strict()


