'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User, Shield, Database, AlertCircle } from 'lucide-react'

interface Profile {
  id: string
  role: string | null
  full_name: string | null
  company_name: string | null
}

export default function AdminDebugPage() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // プロフィール情報を取得
  useEffect(() => {
    if (user && isAuthenticated) {
      setProfileLoading(true)
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, role, full_name, company_name')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('Profile fetch error:', error)
          } else {
            setProfile(data)
          }
        } catch (error) {
          console.error('Profile fetch error:', error)
        } finally {
          setProfileLoading(false)
        }
      }
      fetchProfile()
    } else {
      setProfile(null)
    }
  }, [user, isAuthenticated])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認しています...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">認証が必要です</h2>
          <p className="text-gray-600">このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-600">管理者権限が必要です。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">デバッグ情報</h1>
        <p className="text-gray-600 mt-1">システムの認証・権限状態の確認</p>
      </div>

      {/* ユーザー情報 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center mb-4">
          <User className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">認証情報</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ユーザーID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{user?.id || 'なし'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <p className="mt-1 text-sm text-gray-900">{user?.email || 'なし'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">認証状態</label>
            <p className="mt-1 text-sm">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isAuthenticated ? '認証済み' : '未認証'}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">管理者権限</label>
            <p className="mt-1 text-sm">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isAdmin ? '管理者' : '一般ユーザー'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* プロフィール情報 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Database className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">プロフィール情報</h2>
        </div>
        {profileLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">読み込み中...</span>
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">フルネーム</label>
              <p className="mt-1 text-sm text-gray-900">{profile.full_name || '未設定'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">会社名</label>
              <p className="mt-1 text-sm text-gray-900">{profile.company_name || '未設定'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ロール</label>
              <p className="mt-1 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  profile.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.role || 'user'}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600">プロフィール情報の取得に失敗しました</p>
          </div>
        )}
      </div>
    </div>
  )
}