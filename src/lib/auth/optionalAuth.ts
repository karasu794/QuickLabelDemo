import { createClient } from '@/lib/supabase/server'

export type OptionalUser = { id: string } | null

export async function getOptionalUser(): Promise<OptionalUser> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    return data?.user ? { id: data.user.id } : null
  } catch {
    return null
  }
}


