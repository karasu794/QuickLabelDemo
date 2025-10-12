import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Next.jsクライアント用（auth-helpers推奨API）
export const supabase = createClientComponentClient<Database>()

export const signIn = (email: string, password: string, persistSession?: boolean) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password })

export const signOut = () =>
  supabase.auth.signOut()

export const createClient = () => supabase