# Vercel環境変数設定ガイド

## 📋 必要な環境変数

Vercel上でアプリケーションを正常に動作させるために、以下の環境変数を設定する必要があります：

### 🔑 Supabase関連
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 🚚 FedX API関連
```bash
FEDEX_API_KEY=your_fedex_api_key
FEDEX_SECRET_KEY=your_fedex_secret_key
FEDEX_ACCOUNT_NUMBER=your_fedex_account_number
```

### 🌐 サイト設定
```bash
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
```

## 🛠️ Vercel環境変数設定手順

### 1. Vercelダッシュボードにアクセス
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. 対象のプロジェクトを選択
3. **「Settings」**タブをクリック

### 2. 環境変数の追加
1. 左サイドバーから**「Environment Variables」**を選択
2. **「Add New」**ボタンをクリック
3. 各環境変数を個別に追加：

#### **NEXT_PUBLIC_SUPABASE_URL**
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://your-project-id.supabase.co`
- **Environment**: `Production, Preview, Development`

#### **NEXT_PUBLIC_SUPABASE_ANON_KEY**
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGci...` (Supabaseの anon key)
- **Environment**: `Production, Preview, Development`

#### **SUPABASE_SERVICE_ROLE_KEY** ⚠️ 重要
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGci...` (Supabaseの service_role key)
- **Environment**: `Production, Preview, Development`

#### **FEDEX_API_KEY**
- **Name**: `FEDEX_API_KEY`
- **Value**: FedXデベロッパーアカウントのAPI Key
- **Environment**: `Production, Preview, Development`

#### **FEDEX_SECRET_KEY**
- **Name**: `FEDEX_SECRET_KEY`
- **Value**: FedXデベロッパーアカウントのSecret Key
- **Environment**: `Production, Preview, Development`

#### **FEDEX_ACCOUNT_NUMBER**
- **Name**: `FEDEX_ACCOUNT_NUMBER`
- **Value**: FedXアカウント番号
- **Environment**: `Production, Preview, Development`

#### **NEXT_PUBLIC_SITE_URL**
- **Name**: `NEXT_PUBLIC_SITE_URL`
- **Value**: `https://your-vercel-app.vercel.app`
- **Environment**: `Production, Preview, Development`

### 3. 変更の保存と再デプロイ
1. 各環境変数を追加後、**「Save」**をクリック
2. **「Deployments」**タブに移動
3. 最新のデプロイメントの**「⋯」**メニューから**「Redeploy」**を選択

## 🔍 Supabaseキーの取得方法

### 1. Supabaseダッシュボードへアクセス
1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. 対象のプロジェクトを選択

### 2. API キーの確認
1. 左サイドバーから**「Settings」** → **「API」**を選択
2. 以下のキーをコピー：
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`用
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`用
   - **service_role**: `SUPABASE_SERVICE_ROLE_KEY`用 ⚠️**秘密鍵**

## ⚠️ セキュリティ注意事項

### Service Role Keyについて
- **🔐 絶対に秘密にしてください**
- RLSポリシーをバイパスし、全データにアクセス可能
- クライアントサイド（ブラウザ）では**絶対に使用しないでください**
- サーバーサイド（API Routes）でのみ使用

### 環境変数の管理
- 本番環境とプレビュー環境で同じ値を使用
- 開発環境では開発用のSupabaseプロジェクトを使用推奨
- 定期的にキーのローテーション（更新）を実施

## 🧪 設定確認方法

### 1. Vercelログの確認
1. Vercelダッシュボードの**「Functions」**タブ
2. API Route の実行ログを確認
3. 以下のログが出力されることを確認：
   ```
   環境変数確認: {supabaseUrl: '設定済み', supabaseKey: '設定済み', serviceRoleKey: '設定済み'}
   Service Role Keyでのクライアント作成完了
   ```

### 2. 管理者ページでのテスト
1. `/admin/users`にアクセス
2. 以下の表示を確認：
   - ✅ Service Role Key経由でSupabaseに接続済み
   - ユーザーデータの一覧表示

### 3. 見積もり機能のテスト
1. 見積もりリクエストを送信
2. quote_jobsテーブルにデータが作成されることを確認
3. ポーリング処理が正常に動作することを確認

## 🔧 トラブルシューティング

### よくあるエラーと対処法

#### ❌ `データベース設定エラー: SUPABASE_URLが未設定`
- **原因**: `NEXT_PUBLIC_SUPABASE_URL`が設定されていない
- **対処**: Vercelの環境変数設定を確認

#### ❌ `Supabase URL または Service Role Key が設定されていません`
- **原因**: `SUPABASE_SERVICE_ROLE_KEY`が設定されていない
- **対処**: Service Role Keyを正しく設定

#### ❌ `Error fetching profiles: 認証エラー`
- **原因**: Service Role Keyが間違っている
- **対処**: Supabaseダッシュボードから正しいキーを再取得

#### ❌ `見積もりジョブの作成に失敗しました`
- **原因**: quote_jobsテーブルのRLSポリシー設定
- **対処**: `allow_server_access.sql`を実行

## 📚 関連ドキュメント

- [allow_server_access.sql](./allow_server_access.sql) - RLSポリシー設定
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase基本設定
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase API Documentation](https://supabase.com/docs/reference/javascript/introduction) 