// src/components/URLStatusMessages.tsx
'use client'

import { useSearchParams } from 'next/navigation'

export default function URLStatusMessages() {
  const searchParams = useSearchParams()
  const registrationSuccess = searchParams.get('registration')
  const authError = searchParams.get('error')

  return (
    <>
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
    </>
  )
}