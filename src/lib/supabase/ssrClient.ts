import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createSSRClient() {
  const cookieStore = cookies()
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) throw new Error('SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing')

  // SUPABASE_URL から projectRef を抽出し、サーバが参照するクッキー名を統一
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
  const projectRef = match?.[1]
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : 'sb-access-token'

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set(name, value, options)
        } catch {
          // Server Component では set は許可されないことがある
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        } catch {
          // Server Component では remove は許可されないことがある
        }
      },
    },
    cookieOptions: {
      name: cookieName,
    },
  })
}


