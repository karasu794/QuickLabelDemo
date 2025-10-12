import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export function createSSRClient() {
  // Server Component 用 helpers クライアント（middleware/updateと同一流儀）
  return createServerComponentClient({ cookies })
}


