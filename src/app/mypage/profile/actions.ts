'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ProfileData {
  full_name: string
  company_name: string
  phone_number: string
  address: string
  postal_code: string
  city: string
  state: string
  country: string
}

export async function updateProfile(userId: string, profileData: ProfileData) {
  try {
    const supabase = createClient()

    // プロフィールを更新
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        company_name: profileData.company_name,
        phone_number: profileData.phone_number,
        address: profileData.address,
        postal_code: profileData.postal_code,
        city: profileData.city,
        state: profileData.state,
        country: profileData.country,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('プロフィール更新エラー:', error)
      return {
        success: false,
        error: 'プロフィールの更新に失敗しました'
      }
    }

    // ページを再検証
    revalidatePath('/mypage/profile')
    revalidatePath('/mypage')

    return {
      success: true
    }
  } catch (error) {
    console.error('Server action エラー:', error)
    return {
      success: false,
      error: 'サーバーエラーが発生しました'
    }
  }
} 