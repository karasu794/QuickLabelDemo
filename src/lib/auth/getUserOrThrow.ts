import { createClient } from '@/lib/supabase/server'

export async function getUserOrThrow() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('unauthorized')
  return { supabase, user: data.user }
}


