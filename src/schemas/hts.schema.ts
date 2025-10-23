import { z } from 'zod'

export const HTSInputSchema = z.object({
  descriptionJa: z.string().optional(),
  descriptionEn: z.string().optional(),
  weightKg: z.number().nonnegative(),
  originCountry: z.string().min(2),
}).strict()

export const HTSItemSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  notes: z.array(z.string().min(1)).optional(),
  evidenceUrls: z.array(z.string().url()).default([]),
}).strict()

export const HTSOutputSchema = z.array(HTSItemSchema)


