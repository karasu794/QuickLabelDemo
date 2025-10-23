import { z } from 'zod'

export const PathSchema = z.string().regex(/^(src|app|tests|docs)\//, 'invalid path')

export const FileChangeSchema = z.object({
  path: PathSchema,
  content: z.string(),
}).strict()

export const CodeDiffSchema = z.object({
  path: PathSchema,
  code: z.string().min(1),
}).strict()

export const TestSpecSchema = z.object({
  type: z.enum(['contract','e2e','unit']),
  path: z.string().regex(/^tests\//, 'invalid test path'),
  content: z.string().min(1),
}).strict()

export const ManualQASchema = z.object({
  description: z.string().min(1),
}).strict()

export const SpecWriterSchema = z.object({
  files: z.array(FileChangeSchema).default([]),
  diffs: z.array(CodeDiffSchema).default([]),
  tests: z.array(TestSpecSchema).default([]),
  manualQA: z.array(ManualQASchema).default([]),
}).strict()


