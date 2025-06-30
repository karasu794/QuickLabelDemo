import { redirect } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/supabase/server'

export default async function AccountPage() {
  // ユーザーの認証情報を取得
  const user = await getUser()

  // ユーザーがログインしていない場合は /login にリダイレクト
  if (!user) {
    redirect('/login')
  }

  // プロフィール情報を取得
  const profile = await getUserProfile()

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1>アカウント情報</h1>

      <div style={{ marginTop: '2rem' }}>
        <h2>ユーザー情報</h2>
        <div style={{ background: '#e8f5e8', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <p><strong>ログイン中のユーザー: {user.email}</strong></p>
          <p>ユーザーID: {user.id}</p>
          <p>作成日: {new Date(user.created_at).toLocaleString('ja-JP')}</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>プロフィール情報</h2>
        {profile ? (
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>メールアドレス:</strong> {profile.email || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>お名前:</strong> {profile.contact_name || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>お名前（かな）:</strong> {profile.contact_name_kana || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>会社名:</strong> {profile.company_name || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>部署:</strong> {profile.department || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>役職:</strong> {profile.title || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>電話番号:</strong> {profile.phone_number || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>郵便番号:</strong> {profile.postal_code || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>都道府県:</strong> {profile.address_prefecture || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>市区町村:</strong> {profile.address_city || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>住所1:</strong> {profile.address_line1 || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>住所2:</strong> {profile.address_line2 || '未設定'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>プロフィール作成日:</strong> {profile.created_at ? new Date(profile.created_at).toLocaleString('ja-JP') : '未設定'}
            </div>
          </div>
        ) : (
          <div style={{ background: '#f8d7da', padding: '1rem', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
            <p><strong>❌ エラー: プロフィール情報が取得できませんでした</strong></p>
            <p>データベースのトリガーが正常に動作していない可能性があります。</p>
            <p>SupabaseのSQL Editorで以下のファイルを実行してください：</p>
            <code>supabase_user_profile_trigger.sql</code>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block',
            padding: '0.5rem 1rem', 
            background: '#0070f3', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}
        >
          ホームに戻る
        </a>
      </div>
    </div>
  )
} 