import { ZodSchema, ZodTypeAny } from 'zod'

export function validateOrThrow<T>(schema: ZodSchema<T> | ZodTypeAny, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ path: i.path, message: i.message, code: i.code }))
    throw new Error(JSON.stringify(issues))
  }
  return result.data as T
}

export function isValid(schema: ZodSchema<any> | ZodTypeAny, data: unknown): boolean {
  return schema.safeParse(data).success
}


