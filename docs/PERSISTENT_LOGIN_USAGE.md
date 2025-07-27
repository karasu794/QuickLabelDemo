# ログイン状態保持機能（Persistent Login）の使用方法

## 概要
このプロジェクトでは、ユーザーが「ログイン状態を保持する」かどうかを選択できる機能が実装されています。この機能により、セキュリティニーズに応じて適切なセッション管理を行うことができます。

## 機能の詳細

### チェックボックスON（デフォルト）: 永続的ログイン
- **ストレージ**: `localStorage`に保存
- **保持期間**: ブラウザを閉じても維持
- **用途**: 個人用デバイスでの利用
- **セキュリティレベル**: 通常

### チェックボックスOFF: 一時的ログイン
- **ストレージ**: `sessionStorage`に保存
- **保持期間**: ブラウザタブを閉じると消失
- **用途**: 共有デバイスや公共環境での利用
- **セキュリティレベル**: 高

## 実装詳細

### 1. ログインフォーム (`LoginForm.tsx`)
```typescript
const [persistSession, setPersistSession] = useState(true)

// ログイン時に永続化オプションを渡す
const { data, error } = await signIn(email, password, persistSession)
```

**UI コンポーネント:**
- チェックボックス: ログイン状態保持の選択
- 説明テキスト: 現在の設定による挙動の説明
- 視覚的フィードバック: 選択状態に応じたアイコンと説明

### 2. サインイン関数 (`client.ts`)
```typescript
export const signIn = async (
  email: string, 
  password: string, 
  persistSession: boolean = true
) => {
  // ストレージタイプを決定
  const storageType = persistSession ? 'localStorage' : 'sessionStorage'
  
  // カスタムストレージでクライアントを作成
  const clientWithCustomStorage = createClientWithCustomStorage(storageType)
  
  // サインイン実行
  const result = await clientWithCustomStorage.auth.signInWithPassword({
    email,
    password,
  })
  
  // 非永続化の場合、古いlocalStorageデータをクリア
  if (!persistSession && result.data?.session) {
    window.localStorage.removeItem('quicklabel-auth-token')
  }
  
  return result
}
```

### 3. カスタムストレージ実装
```typescript
const createClientWithCustomStorage = (
  storageType: 'localStorage' | 'sessionStorage'
) => {
  const customStorage = {
    getItem: (key: string) => {
      if (storageType === 'sessionStorage') {
        return window.sessionStorage.getItem(key)
      } else {
        return window.localStorage.getItem(key)
      }
    },
    setItem: (key: string, value: string) => {
      if (storageType === 'sessionStorage') {
        window.sessionStorage.setItem(key, value)
      } else {
        window.localStorage.setItem(key, value)
      }
    },
    removeItem: (key: string) => {
      if (storageType === 'sessionStorage') {
        window.sessionStorage.removeItem(key)
      } else {
        window.localStorage.removeItem(key)
      }
    }
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: customStorage,
      storageKey: storageType === 'sessionStorage' 
        ? 'quicklabel-auth-session' 
        : 'quicklabel-auth-token'
    }
  })
}
```

### 4. セッション復元 (`useAuth.ts`)
```typescript
const restoreSessionFromStorage = async () => {
  // 1. localStorage（永続的セッション）を確認
  const { data: { session: primarySession } } = await supabase.auth.getSession()
  
  if (primarySession?.user) {
    return { user: primarySession.user, session: primarySession }
  }
  
  // 2. sessionStorage（一時的セッション）を確認
  const sessionStorageKeys = [
    'quicklabel-auth-session',
    'sb-quicklabel-auth-session'
  ]
  
  for (const key of sessionStorageKeys) {
    const sessionData = window.sessionStorage.getItem(key)
    if (sessionData) {
      const parsed = JSON.parse(sessionData)
      if (parsed.access_token && parsed.user) {
        return { user: parsed.user, session: parsed }
      }
    }
  }
  
  return { user: null, session: null }
}
```

## セキュリティ考慮事項

### 永続的ログイン（localStorage）
**利点:**
- ユーザビリティが高い
- 再ログインの手間が不要

**リスク:**
- デバイス盗難時のセキュリティリスク
- 共有デバイスでの使用には不適切

### 一時的ログイン（sessionStorage）
**利点:**
- セッション自動終了によるセキュリティ向上
- 共有デバイスでの安全な利用

**リスク:**
- ユーザビリティが若干低下
- 誤ってタブを閉じた場合の再ログイン必要

## 使用推奨パターン

### 個人用デバイス
```typescript
// デフォルトでチェックON
setPersistSession(true)
```

### 共有・公共デバイス
```typescript
// デフォルトでチェックOFF
setPersistSession(false)
```

### セキュリティレベル別設定
```typescript
// 高セキュリティ要求（管理者など）
const isAdminUser = profile?.role === 'admin'
setPersistSession(!isAdminUser) // 管理者は一時的ログインを推奨

// 一般ユーザー
setPersistSession(true) // 利便性を優先
```

## デバッグとログ

### コンソール出力例

**永続的ログイン（localStorage）:**
```
🔐 サインイン開始: { email: "user@example.com", persistSession: true }
📱 ストレージタイプ: localStorage
✅ サインイン完了: { success: true, storageUsed: "localStorage" }
✅ プライマリセッション復元成功 (localStorage)
```

**一時的ログイン（sessionStorage）:**
```
🔐 サインイン開始: { email: "user@example.com", persistSession: false }
📱 ストレージタイプ: sessionStorage
🧹 非永続化ログイン: localStorageデータをクリア
✅ サインイン完了: { success: true, storageUsed: "sessionStorage" }
✅ sessionStorageセッション復元成功
```

## トラブルシューティング

### セッションが復元されない
1. ブラウザの開発者ツールでストレージを確認
2. コンソールログでセッション復元プロセスを確認
3. ネットワークタブでSupabase APIの応答を確認

### 予期しないログアウト
- 一時的ログインでタブを閉じた場合は正常な動作
- 永続的ログインでも発生する場合はSupabaseのセッション期限を確認

### ストレージが切り替わらない
- ブラウザのキャッシュクリア
- 古いセッションデータの手動削除

## 今後の拡張

### 可能な追加機能
1. **デバイス管理**: 登録デバイスの一覧表示・削除
2. **セッション期限設定**: ユーザーごとのカスタム期限
3. **多要素認証**: 高セキュリティモードでの追加認証
4. **ログイン履歴**: アクセス履歴の記録・表示

この機能により、ユーザーは自身のセキュリティニーズに応じて適切なログイン方式を選択できるようになりました。 