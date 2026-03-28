# Supabase 復旧作業 技術レポート

## 背景

FQL（FedEx Quick Label）プロジェクトで使用していた Supabase プロジェクトが、無料プランの90日間非アクティブ制限により自動停止（pause）された。
これにより、データベース接続・認証・API すべてが停止し、アプリケーションが完全に利用不可となった。

- 対象: Supabase Free Plan プロジェクト
- 停止原因: 90日間のリクエスト不在による自動 pause
- 影響範囲: PostgreSQL / Auth / Storage / Edge Functions すべて

## 問題点

| # | 問題 | 影響 |
|---|------|------|
| 1 | DB 接続不可 | 全 API が 500 エラー |
| 2 | Auth 停止 | ログイン・セッション管理が不可 |
| 3 | RLS ポリシー状態不明 | 復旧後のデータアクセス制御が未検証 |
| 4 | スキーマ変更の可能性 | 停止前後でマイグレーション状態の整合性が不明 |

## 対応内容

### Step 1: プロジェクト復旧（Supabase Dashboard）

1. Supabase Dashboard にログイン
2. 停止中プロジェクトの「Restore project」を実行
3. 復旧完了まで約 3〜5 分待機
4. Dashboard 上で DB / Auth のステータスが `Active` に戻ったことを確認

### Step 2: 環境変数の確認・再設定

`.env.local` に以下の変数が正しく設定されていることを確認:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=xxxxx
SUPABASE_PROJECT_REF=xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
```

Dashboard の Settings > API から最新の値を取得し、停止前の値と差異がないことを確認した。

### Step 3: 接続確認テスト（CRUD + RLS）

`scripts/test-supabase-connection.ts` を作成し、以下の5項目を自動検証:

```bash
npx tsx scripts/test-supabase-connection.ts
```

| テスト | クライアント | 対象テーブル | 結果 |
|--------|-------------|-------------|------|
| ① READ | Service Role | address_book | ✅ 1件取得成功 |
| ② INSERT | Service Role | address_book | ✅ テストデータ挿入成功 |
| ③ UPDATE | Service Role | address_book | ✅ contact_name 更新成功 |
| ④ DELETE | Service Role | address_book | ✅ テストデータ削除成功 |
| ⑤ RLS (Anon) | Anon Key | address_book | ✅ READ=0件 / INSERT=拒否 |

テストスクリプトの特徴:
- Service Role Key（RLS バイパス）と Anon Key（RLS 適用）の両方で検証
- テストデータは自動クリーンアップ（既存データに影響なし）
- `org_id` の NOT NULL 制約、`user_id` の外部キー制約に対応

### Step 4: アプリケーション起動確認

ESM 互換性の問題（`"type": "module"` 起因）を修正し、開発サーバーの起動を確認:

| ファイル | 問題 | 対応 |
|---------|------|------|
| `scripts/download-chromium.js` | `require` 使用 | `.cjs` にリネーム |
| `next.config.js` | `module.exports` 使用 | `export default` に変更 |
| `postcss.config.js` | `module.exports` 使用 | `.cjs` にリネーム |
| `jest.config.js` / `jest.setup.js` | `require` 使用 | `.cjs` にリネーム |

```bash
pnpm run dev
# ✅ Ready in 2.6s — http://localhost:3000
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 14 (App Router) / TypeScript 5 |
| データベース | Supabase (PostgreSQL) |
| 認証 | Supabase Auth |
| アクセス制御 | Row Level Security (RLS) |
| キャッシュ | Upstash Redis |
| 決済 | Square Web Payments SDK |
| テスト | tsx (スクリプト実行) / Jest / Playwright |
| デプロイ | Vercel |

## 成果

- Supabase の停止状態から完全復旧を達成
- CRUD 操作の正常性を自動テストで検証
- RLS が正しく機能していることを確認（未認証アクセスの遮断）
- ESM 互換性問題を5ファイル修正し、ローカル開発環境を復旧
- 再利用可能なテストスクリプトを整備

## 応用可能性

- Supabase Free Plan を使用する全プロジェクトで同様の停止リスクがある
- 本テストスクリプトは `address_book` 以外のテーブルにも容易に拡張可能
- RLS テストのパターンは、マルチテナント SaaS のアクセス制御検証に転用できる
- ESM/CJS 互換性の修正パターンは、`"type": "module"` を採用した Node.js プロジェクト全般に適用可能
