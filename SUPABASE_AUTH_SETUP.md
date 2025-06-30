# Supabase 認証設定ガイド

## 🔧 必須設定：認証コールバックURL

メール確認が正常に動作するように、Supabaseプロジェクトで以下の設定を行ってください：

### **1. Supabaseダッシュボードでの設定**

1. **Supabaseダッシュボード**にログイン
2. プロジェクトを選択
3. 左側メニューから **「Authentication」** > **「URL Configuration」** を選択

### **2. Site URLの設定**

**Site URL** に以下を入力：
```
http://localhost:3000
```

### **3. Redirect URLsの設定**

**Redirect URLs** に以下を追加：
```
http://localhost:3000/auth/callback
```

## 📧 メール確認フローの説明

### **正常なフロー**：
1. **ユーザーが新規登録** → `/signup`でフォーム送信
2. **Supabaseがメール送信** → 確認メール送信
3. **ユーザーがメールリンククリック** → `http://localhost:3000/auth/callback?code=...`
4. **Route Handlerが処理** → セッション確立
5. **ホームページにリダイレクト** → ログイン状態で表示

### **現在の問題と解決**：

❌ **問題**: メール確認リンクをクリックしてもログイン状態にならない
✅ **解決**: 認証コールバック用のRoute Handler（`/auth/callback`）を作成

## 🚀 テスト手順

### **1. 設定確認**
- [ ] Supabaseで Site URL = `http://localhost:3000`
- [ ] Supabaseで Redirect URLs に `http://localhost:3000/auth/callback` を追加
- [ ] Next.jsサーバーが起動中（`npm run dev`）

### **2. 新規登録テスト**
1. `http://localhost:3000/signup` にアクセス
2. メールアドレスとパスワードを入力
3. 「登録する」ボタンをクリック
4. 成功メッセージとリダイレクト確認

### **3. メール確認テスト**
1. 受信したメール内の「Confirm your mail」リンクをクリック
2. `http://localhost:3000/auth/callback?code=...` に遷移
3. その後ホームページにリダイレクト
4. ログイン状態の表示確認

## 🛠️ 実装ファイル

| ファイル | 役割 |
|----------|------|
| `src/app/auth/callback/route.ts` | メール確認コールバック処理 |
| `src/app/signup/page.tsx` | 新規登録フォーム |
| `src/app/page.tsx` | ホームページ（ログイン状態表示） |

## 🔍 デバッグ方法

### **ターミナルログ確認**：
- `GET /auth/callback?code=...` のアクセス
- 「認証コールバック成功」のログメッセージ

### **ブラウザ確認**：
- ホームページでユーザー情報が表示される
- 「✅ ユーザーログイン済み」状態の確認

## ⚠️ 注意事項

- **本番環境**では Site URL と Redirect URLs を本番ドメインに変更
- **RLS（Row Level Security）**を有効にして適切なポリシーを設定
- **メール確認リンクの有効期限**は24時間（Supabaseデフォルト） 