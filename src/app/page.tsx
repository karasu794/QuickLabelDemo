'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/client'
import QuoteFormComponent from '@/components/QuoteFormComponent'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/supabase'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()



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

  // URLパラメータからメッセージを表示
  const registrationSuccess = searchParams.get('registration')
  const authError = searchParams.get('error')

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', textAlign: 'center' }}>
        <h1>QuickLabel - Supabase連携テスト</h1>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>QuickLabel - Supabase連携テスト</h1>
      
      {/* 登録成功メッセージ */}
      {registrationSuccess === 'success' && (
        <div style={{ 
          background: '#d4edda', 
          padding: '1rem', 
          borderRadius: '4px', 
          border: '1px solid #c3e6cb',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: '0', color: '#155724' }}>
            <strong>✅ 登録が完了しました！</strong><br />
            確認メールを送信しましたので、メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
        </div>
      )}

      {/* エラーメッセージ */}
      {authError && (
        <div style={{ 
          background: '#f8d7da', 
          padding: '1rem', 
          borderRadius: '4px', 
          border: '1px solid #f5c6cb',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: '0', color: '#721c24' }}>
            <strong>❌ 認証エラーが発生しました</strong><br />
            {authError === 'auth_callback_error' && 'メール確認の処理中にエラーが発生しました。'}
            {authError === 'otp_expired' && 'メール確認リンクの有効期限が切れています。'}
            {authError === 'access_denied' && 'アクセスが拒否されました。'}
            {authError === 'unexpected_error' && '予期しないエラーが発生しました。'}
          </p>
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}>
        <h2>認証状況:</h2>
        {user ? (
          <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>✅ ユーザーログイン済み</strong></p>
            <p>ID: {user.id}</p>
            <p>Email: {user.email}</p>
            <p>作成日: {new Date(user.created_at).toLocaleString('ja-JP')}</p>
          </div>
        ) : (
          <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>⚠️ ユーザー未ログイン</strong></p>
            <p>Supabaseで認証を行ってください</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>プロフィール情報:</h2>
        {profile ? (
          <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>✅ プロフィール取得成功</strong></p>
            <p>名前: {profile.contact_name || '未設定'}</p>
            <p>名前（かな）: {profile.contact_name_kana || '未設定'}</p>
            <p>会社名: {profile.company_name || '未設定'}</p>
            <p>部署: {profile.department || '未設定'}</p>
            <p>役職: {profile.title || '未設定'}</p>
          </div>
        ) : user ? (
          <div style={{ background: '#f8d7da', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>❌ プロフィール未作成</strong></p>
            <p>データベーストリガーが正常に動作していない可能性があります</p>
          </div>
        ) : (
          <div style={{ background: '#f1f3f4', padding: '1rem', borderRadius: '4px' }}>
            <p>ログイン後にプロフィール情報が表示されます</p>
          </div>
        )}
      </div>

      {/* 見積もりフォーム */}
      <QuoteFormComponent />

      <div style={{ marginTop: '2rem' }}>
        <h2>ページナビゲーション:</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <a 
            href="/account" 
            style={{ 
              display: 'inline-block',
              padding: '0.5rem 1rem', 
              background: '#0070f3', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}
          >
            アカウントページ
          </a>
          <a 
            href="/signup" 
            style={{ 
              display: 'inline-block',
              padding: '0.5rem 1rem', 
              background: '#28a745', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}
          >
            新規登録
          </a>
          <a 
            href="/login" 
            style={{ 
              display: 'inline-block',
              padding: '0.5rem 1rem', 
              background: '#17a2b8', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}
          >
            ログイン
          </a>
          <a 
            href="/api-test" 
            style={{ 
              display: 'inline-block',
              padding: '0.5rem 1rem', 
              background: '#fd7e14', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}
          >
            APIテスト
          </a>
          <a 
            href="/shipping/new/shipper" 
            style={{ 
              display: 'inline-block',
              padding: '0.5rem 1rem', 
              background: '#6f42c1', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '4px' 
            }}
          >
            送り状作成
          </a>
          <span style={{ color: '#666', fontSize: '0.9rem', padding: '0.5rem' }}>
            {user ? '（ログイン済み）' : '（未ログイン）'}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>次の手順:</h2>
        <ol>
          <li>Supabaseプロジェクトでユーザー認証を設定</li>
          <li>先ほど作成したトリガーをSupabaseで実行</li>
          <li>テストユーザーを作成して動作確認</li>
          <li>アカウントページでプロフィール情報の表示を確認</li>
        </ol>
      </div>
    </div>
  )
}
