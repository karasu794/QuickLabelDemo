import { createClient } from 'openapi-fetch'
// 型は openapi-typescript 生成物を参照
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { paths } from '@/gen/square/schema'

export function squareClient(baseUrl: string, token?: string) {
  return createClient<paths>({ baseUrl, headers: token ? { Authorization: `Bearer ${token}` } : undefined })
}


