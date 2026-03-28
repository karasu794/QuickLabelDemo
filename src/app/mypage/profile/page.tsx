'use client'

// 動的レンダリングを強制してキャッシュを回避
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { User, Building, MapPin, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile } from './actions'
import AsciiPreviewField from '@/components/AsciiPreviewField'
import toast from 'react-hot-toast'

const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo'

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

export default function ProfilePage() {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    company_name: '',
    phone_number: '',
    address: '',
    postal_code: '',
    city: '',
    state: '',
    country: 'JP'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // プロフィールデータを読み込む
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const supabase = createClient()
        // NOTE: 型はSupabase型定義に依存しない簡易読み取りのため省略
        const { data: profile, error } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id) as any)
          .single()

        if (error) {
          console.error('プロフィール取得エラー:', error)
          return
        }

        if (profile) {
          const addressCombined = [
            profile.address_prefecture,
            profile.address_city,
            profile.address_line1,
            profile.address_line2,
          ].filter((v) => !!v && v.length > 0).join(' ')

          setProfileData({
            full_name: profile.full_name || '',
            company_name: profile.company_name || '',
            phone_number: profile.phone_number || '',
            address: addressCombined || '',
            postal_code: '',
            city: '',
            state: '',
            country: 'JP'
          })
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error)
      }
    }

    fetchProfile()
  }, [user])

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (IS_DEMO) {
      toast('デモ環境のため、プロフィール更新はスキップされます', { icon: 'ℹ️' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const result = await updateProfile(user.id, profileData)
      
      if (result.success) {
        setMessage({ type: 'success', text: 'プロフィールを更新しました' })
      } else {
        setMessage({ type: 'error', text: result.error || '更新に失敗しました' })
      }
    } catch (error) {
      console.error('プロフィール更新エラー:', error)
      setMessage({ type: 'error', text: '更新中にエラーが発生しました' })
    } finally {
      setLoading(false)
    }
  }

  // AuthGuardによる認証チェックに任せる
  // 個別ページでの認証チェックは削除

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">プロフィール編集</h1>
            <p className="text-gray-600">個人情報や会社情報を更新できます</p>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* プロフィールフォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              基本情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  氏名
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="山田太郎"
                  data-test="jp-full-name"
                />
              </div>
              <AsciiPreviewField label="氏名" jpValue={profileData.full_name} testId="ascii-full-name" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={profileData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="090-1234-5678"
                  data-test="jp-phone"
                />
              </div>
              <AsciiPreviewField label="電話番号" jpValue={profileData.phone_number} testId="ascii-phone" />
            </div>
          </div>

          {/* 会社情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              会社情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会社名
                </label>
                <input
                  type="text"
                  value={profileData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="株式会社サンプル"
                  data-test="jp-company"
                />
              </div>
              <AsciiPreviewField label="会社名" jpValue={profileData.company_name} testId="ascii-company" />
            </div>
          </div>

          {/* 住所情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              住所情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  郵便番号
                </label>
                <input
                  type="text"
                  value={profileData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123-4567"
                  data-test="jp-postal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  都道府県
                </label>
                <input
                  type="text"
                  value={profileData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="東京都"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  市区町村
                </label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="新宿区"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  国
                </label>
                <select
                  value={profileData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="JP">日本</option>
                  <option value="US">アメリカ</option>
                  <option value="CN">中国</option>
                  <option value="KR">韓国</option>
                  <option value="TW">台湾</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所
                </label>
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="丁目番地、ビル名・マンション名・部屋番号など"
                  data-test="jp-address1"
                />
              </div>
              <AsciiPreviewField label="住所" jpValue={profileData.address} testId="ascii-address1" />
            </div>
          </div>

          {/* 更新ボタン */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {loading ? '更新中...' : 'プロフィールを更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 