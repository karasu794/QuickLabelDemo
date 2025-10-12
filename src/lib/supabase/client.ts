import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Browser client: sb-<projectRef>-auth-token(.0/.1) へJSONチャンクで書き込み
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient<Database>(url, anon)

export const signIn = (email: string, password: string, persistSession?: boolean) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password })

export const signOut = () =>
  supabase.auth.signOut()

export const createClient = () => supabase