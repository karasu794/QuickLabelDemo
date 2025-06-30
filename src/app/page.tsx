'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/client'
import { getStatesByCountry } from '@/lib/data/locations'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/supabase'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  // 郵便番号が任意となる国のリスト
  const postalCodeOptionalCountries = ['HK', 'AE', 'SG']
  
  // 郵便番号が不要で都市名が必要な国のリスト
  const postalCodeNotRequiredCountries = ['HK', 'AE', 'SG']

  // 見積もりフォーム用のstate
  const [quoteForm, setQuoteForm] = useState({
    senderPostalCode: '',
    senderCountryCode: 'JP',
    senderCityName: '',
    recipientPostalCode: '',
    recipientCountryCode: 'US',
    recipientStateCode: '',
    recipientCityName: '',
    weight: ''
  })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [rates, setRates] = useState<Array<{
    serviceName: string
    amount: number
    currency: string
  }>>([])
  const [quoteError, setQuoteError] = useState<string | null>(null)

  // 見積もりフォームの入力値変更ハンドラー
  const handleQuoteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setQuoteForm(prev => {
      // 仕向地の国コードが変更された場合、州コードと都市名をリセット
      if (name === 'recipientCountryCode') {
        return {
          ...prev,
          [name]: value,
          recipientStateCode: '',
          recipientCityName: ''
        }
      }
      // 出荷元の国コードが変更された場合、都市名をリセット
      if (name === 'senderCountryCode') {
        return {
          ...prev,
          [name]: value,
          senderCityName: ''
        }
      }
      return {
        ...prev,
        [name]: value
      }
    })
  }

  // 見積もりフォームの送信ハンドラー
  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuoteLoading(true)
    setQuoteError(null)
    setRates([])

    try {
      const requestBody: any = {
        sender: {
          postalCode: quoteForm.senderPostalCode,
          countryCode: quoteForm.senderCountryCode
        },
        recipient: {
          postalCode: quoteForm.recipientPostalCode,
          countryCode: quoteForm.recipientCountryCode
        },
        package: {
          weight: parseFloat(quoteForm.weight)
        }
      }

      // 出荷元の都市名を追加（設定されている場合）
      if (quoteForm.senderCityName) {
        requestBody.sender.city = quoteForm.senderCityName
      }

      // 仕向地の都市名を追加（設定されている場合）
      if (quoteForm.recipientCityName) {
        requestBody.recipient.city = quoteForm.recipientCityName
      }

      // USまたはCAの場合は州コードも追加
      if ((quoteForm.recipientCountryCode === 'US' || quoteForm.recipientCountryCode === 'CA') && quoteForm.recipientStateCode) {
        requestBody.recipient.stateCode = quoteForm.recipientStateCode
      }

      console.log('見積もりリクエスト送信:', requestBody)

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      console.log('見積もりAPI レスポンス:', data)
      
      if (response.ok && data.success) {
        // 成功時は料金情報をstateに保存
        if (data.rates && data.rates.length > 0) {
          setRates(data.rates)
        } else {
          setQuoteError('見積もり結果が取得できませんでした')
        }
      } else {
        // エラー時
        setQuoteError(data.error || 'APIリクエストが失敗しました')
      }
    } catch (error) {
      console.error('見積もりAPIエラー:', error)
      setQuoteError('ネットワークエラーが発生しました')
    } finally {
      setQuoteLoading(false)
    }
  }

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
      <div style={{ marginTop: '2rem' }}>
        <h2>📦 送料見積もり</h2>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          border: '1px solid #e9ecef',
          maxWidth: '600px'
        }}>
          <form onSubmit={handleQuoteSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* 出荷元情報 */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#495057' }}>出荷元</h3>
                
                {/* 郵便番号入力欄（郵便番号不要国以外で表示） */}
                {!postalCodeNotRequiredCountries.includes(quoteForm.senderCountryCode) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      郵便番号
                      {postalCodeOptionalCountries.includes(quoteForm.senderCountryCode) && (
                        <span style={{ color: '#6c757d', fontWeight: 'normal' }}> (任意)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="senderPostalCode"
                      value={quoteForm.senderPostalCode}
                      onChange={handleQuoteInputChange}
                      placeholder={
                        postalCodeOptionalCountries.includes(quoteForm.senderCountryCode)
                          ? "郵便番号（任意）"
                          : "例: 100-0001"
                      }
                      required={!postalCodeOptionalCountries.includes(quoteForm.senderCountryCode)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {/* 都市名入力欄（郵便番号不要国で表示） */}
                {postalCodeNotRequiredCountries.includes(quoteForm.senderCountryCode) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      都市名 <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="senderCityName"
                      value={quoteForm.senderCityName}
                      onChange={handleQuoteInputChange}
                      placeholder="例: Hong Kong"
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    国コード
                  </label>
                  <select
                    name="senderCountryCode"
                    value={quoteForm.senderCountryCode}
                    onChange={handleQuoteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="JP">🇯🇵 JP (日本)</option>
                    <option value="US">🇺🇸 US (アメリカ)</option>
                    <option value="CN">🇨🇳 CN (中国)</option>
                    <option value="KR">🇰🇷 KR (韓国)</option>
                    <option value="DE">🇩🇪 DE (ドイツ)</option>
                    <option value="FR">🇫🇷 FR (フランス)</option>
                    <option value="HK">🇭🇰 HK (香港)</option>
                    <option value="AE">🇦🇪 AE (アラブ首長国連邦)</option>
                    <option value="SG">🇸🇬 SG (シンガポール)</option>
                  </select>
                </div>
              </div>

              {/* 荷受先情報 */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#495057' }}>荷受先</h3>
                
                {/* 郵便番号入力欄（郵便番号不要国以外で表示） */}
                {!postalCodeNotRequiredCountries.includes(quoteForm.recipientCountryCode) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      郵便番号
                      {postalCodeOptionalCountries.includes(quoteForm.recipientCountryCode) && (
                        <span style={{ color: '#6c757d', fontWeight: 'normal' }}> (任意)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="recipientPostalCode"
                      value={quoteForm.recipientPostalCode}
                      onChange={handleQuoteInputChange}
                      placeholder={
                        postalCodeOptionalCountries.includes(quoteForm.recipientCountryCode)
                          ? "郵便番号（任意）"
                          : "例: 10001"
                      }
                      required={!postalCodeOptionalCountries.includes(quoteForm.recipientCountryCode)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {/* 都市名入力欄（郵便番号不要国で表示） */}
                {postalCodeNotRequiredCountries.includes(quoteForm.recipientCountryCode) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      都市名 <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="recipientCityName"
                      value={quoteForm.recipientCityName}
                      onChange={handleQuoteInputChange}
                      placeholder="例: Dubai"
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    国コード
                  </label>
                  <select
                    name="recipientCountryCode"
                    value={quoteForm.recipientCountryCode}
                    onChange={handleQuoteInputChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="US">🇺🇸 US (アメリカ)</option>
                    <option value="CA">🇨🇦 CA (カナダ)</option>
                    <option value="JP">🇯🇵 JP (日本)</option>
                    <option value="CN">🇨🇳 CN (中国)</option>
                    <option value="KR">🇰🇷 KR (韓国)</option>
                    <option value="DE">🇩🇪 DE (ドイツ)</option>
                    <option value="FR">🇫🇷 FR (フランス)</option>
                    <option value="HK">🇭🇰 HK (香港)</option>
                    <option value="AE">🇦🇪 AE (アラブ首長国連邦)</option>
                    <option value="SG">🇸🇬 SG (シンガポール)</option>
                  </select>
                </div>

                {/* 州・県選択（USまたはCAの場合のみ表示） */}
                {(quoteForm.recipientCountryCode === 'US' || quoteForm.recipientCountryCode === 'CA') && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      州・県 <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <select
                      name="recipientStateCode"
                      value={quoteForm.recipientStateCode}
                      onChange={handleQuoteInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">-- 州・県を選択してください --</option>
                      {getStatesByCountry(quoteForm.recipientCountryCode as 'US' | 'CA').map(state => (
                        <option key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 荷物情報 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#495057' }}>荷物情報</h3>
              <div style={{ maxWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  重量 (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={quoteForm.weight}
                  onChange={handleQuoteInputChange}
                  placeholder="例: 1.5"
                  min="0.1"
                  step="0.1"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={quoteLoading}
              style={{
                padding: '0.75rem 1.5rem',
                background: quoteLoading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: quoteLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {quoteLoading ? '📡 見積もり中...' : '📋 送料を見積もる'}
            </button>
          </form>
          
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: '#6c757d' }}>
            💡 見積もり結果は下に表示されます。詳細はブラウザのコンソール（F12）でも確認できます。
          </p>
        </div>
        
        {/* ローディング表示 */}
        {quoteLoading && (
          <div style={{
            background: '#e7f3ff',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #b3d9ff',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#0066cc' }}>
              🚚 見積もり中...
            </p>
          </div>
        )}

        {/* エラー表示 */}
        {quoteError && (
          <div style={{
            background: '#f8d7da',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #f5c6cb',
            marginTop: '1rem'
          }}>
            <p style={{ margin: '0', color: '#721c24' }}>
              <strong>❌ エラー:</strong> {quoteError}
            </p>
          </div>
        )}

        {/* 見積もり結果表示 */}
        {rates.length > 0 && (
          <div style={{
            background: '#d4edda',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #c3e6cb',
            marginTop: '1rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#155724' }}>
              ✅ 送料見積もり結果
            </h3>
            <ul style={{ 
              listStyle: 'none', 
              padding: '0', 
              margin: '0'
            }}>
              {rates.map((rate, index) => (
                <li key={index} style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: index < rates.length - 1 ? '0.5rem' : '0',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#155724' }}>
                      📦 {rate.serviceName}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#155724' }}>
                      {rate.amount.toFixed(2)} {rate.currency}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
