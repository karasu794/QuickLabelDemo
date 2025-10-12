import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Next.jsクライアント用（auth-helpers推奨API）
export const supabase = createClientComponentClient<Database>()

export const signIn = (email: string, password: string, persistSession?: boolean) =>
  supabase.auth.signInWithPassword({ email, password })

const getSiteUrl = () => {
  // NEXT_PUBLIC_SITE_URL を優先。未設定時はlocation.originにフォールバック
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export const signUp = (email: string, password: string, nextPath?: string) => {
  const siteUrl = getSiteUrl()
  const base = siteUrl?.replace(/\/$/, '') || ''
  const redirect = new URL(base + '/auth/callback')
  if (nextPath) redirect.searchParams.set('next', nextPath)
  redirect.searchParams.set('type', 'signup')
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirect.toString(),
    },
  })
}

export const signOut = () =>
  supabase.auth.signOut()

export const createClient = () => supabase