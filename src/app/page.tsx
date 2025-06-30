// src/app/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react' // Suspense をインポート
import { getCurrentUser, getUserProfile } from '@/lib/supabase/client'
import QuoteFormComponent from '@/components/QuoteFormComponent' // 分割したフォームをインポート
import URLStatusMessages from '@/components/URLStatusMessages' // 新しく作成したコンポーネントをインポート
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/supabase'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { user } = await getCurrentUser()
        setUser(user)
        
        if (user) {
          const { profile } = await getUserProfile(user.id)
          setProfile(profile)
        }
      } catch (error) {
        console.error('ユーザーデータ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', textAlign: 'center' }}>
        <h1>QuickLabel</h1>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>QuickLabel</h1>
      
      {/* ↓↓↓ ここが修正箇所です ↓↓↓ */}
      <Suspense fallback={<div>メッセージを読み込み中...</div>}>
        <URLStatusMessages />
      </Suspense>
      {/* ↑↑↑ ここまでが修正箇所です ↑↑↑ */}

      <div style={{ marginTop: '2rem' }}>
        <h2>認証状況:</h2>
        {user ? (
          <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>✅ ユーザーログイン済み</strong></p>
            <p>Email: {user.email}</p>
          </div>
        ) : (
          <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>⚠️ ユーザー未ログイン</strong></p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>プロフィール情報:</h2>
        {profile ? (
          <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>✅ プロフィール取得成功</strong></p>
            <p>名前: {profile.contact_name || '未設定'}</p>
          </div>
        ) : user ? (
          <div style={{ background: '#f8d7da', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>❌ プロフィール未作成</strong></p>
          </div>
        ) : (
          <div style={{ background: '#f1f3f4', padding: '1rem', borderRadius: '4px' }}>
            <p>ログイン後にプロフィール情報が表示されます</p>
          </div>
        )}
      </div>

      {/* 見積もりフォームコンポーネントを呼び出し */}
      <QuoteFormComponent />
    </div>
  )
}