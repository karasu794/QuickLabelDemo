import type { z } from 'zod'
import type {
  SpecWriterSchema,
  FileChangeSchema,
  CodeDiffSchema,
  TestSpecSchema,
  ManualQASchema,
} from '@/schemas/specwriter.schema'
import type {
  LogDoctorSchema,
  RootCauseSchema,
  EvidenceSchema,
  RetestPlanSchema,
} from '@/schemas/logdoctor.schema'
import type {
  HTSInputSchema,
  HTSOutputSchema,
  HTSItemSchema,
} from '@/schemas/hts.schema'
import type { DebugReportSchema } from '@/schemas/debug-report.schema'

export type SpecWriter = z.infer<typeof SpecWriterSchema>
export type FileChange = z.infer<typeof FileChangeSchema>
export type CodeDiff = z.infer<typeof CodeDiffSchema>
export type TestSpec = z.infer<typeof TestSpecSchema>
export type ManualQA = z.infer<typeof ManualQASchema>

export type LogDoctor = z.infer<typeof LogDoctorSchema>
export type RootCause = z.infer<typeof RootCauseSchema>
export type Evidence = z.infer<typeof EvidenceSchema>
export type RetestPlan = z.infer<typeof RetestPlanSchema>

export type HTSInput = z.infer<typeof HTSInputSchema>
export type HTSItem = z.infer<typeof HTSItemSchema>
export type HTSOutput = z.infer<typeof HTSOutputSchema>

export type DebugReport = z.infer<typeof DebugReportSchema>
