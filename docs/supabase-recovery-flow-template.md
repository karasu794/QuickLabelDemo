# Supabase 復旧フロー テンプレート

汎用的な Supabase プロジェクト復旧手順。Free Plan の90日停止や障害復旧時に使用する。

## 前提条件

- Supabase Dashboard へのアクセス権
- プロジェクトの環境変数（URL / Keys）の控え
- Node.js 18+ / pnpm or npm

## 所要時間の目安

| ステップ | 時間 |
|---------|------|
| Step 1: Dashboard 復旧 | 3〜10 分 |
| Step 2: 環境変数確認 | 5 分 |
| Step 3: 接続テスト作成・実行 | 15〜30 分 |
| Step 4: アプリ起動確認 | 10〜20 分 |
| 合計 | 30〜60 分 |

## 必要ツール

| ツール | 用途 |
|-------|------|
| Supabase Dashboard | プロジェクト復旧・キー確認 |
| `@supabase/supabase-js` | DB 接続テスト |
| `tsx` or `ts-node` | TypeScript スクリプト実行 |
| `dotenv` | 環境変数読み込み |

## 復旧ステップ

### Step 1: Supabase プロジェクトの復旧

1. https://supabase.com/dashboard にログイン
2. 停止中のプロジェクトを選択
3. 「Restore project」ボタンをクリック
4. ステータスが `Active (Healthy)` になるまで待機
5. Settings > API で URL と Keys が有効であることを確認

確認ポイント:
- Project URL が応答するか（ブラウザで `https://xxxxx.supabase.co` にアクセス）
- API Keys が停止前と同一か

### Step 2: 環境変数の検証

```bash
# .env.local（または該当する env ファイル）に以下が設定されていること
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Dashboard の Settings > API から値をコピーし、差異がないか確認する。
停止・復旧で Keys がローテーションされることは通常ないが、念のため照合する。

### Step 3: 接続確認テスト

以下のテンプレートを使用して接続テストスクリプトを作成:

```typescript
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── テスト対象テーブルとカラムを自分のプロジェクトに合わせて変更 ──
const TABLE = 'your_table_name'
const testId = randomUUID()

async function main() {
  // ① READ
  const { data, error } = await admin.from(TABLE).select('*').limit(1)
  console.log('READ:', error ? `❌ ${error.message}` : `✅ ${data?.length}件`)

  // ② INSERT（カラムはプロジェクトに合わせる）
  const { error: insertErr } = await admin
    .from(TABLE)
    .insert({ id: testId, /* ...必須カラム */ })
  console.log('INSERT:', insertErr ? `❌ ${insertErr.message}` : '✅')

  // ③ UPDATE
  const { error: updateErr } = await admin
    .from(TABLE)
    .update({ /* 更新カラム */ })
    .eq('id', testId)
  console.log('UPDATE:', updateErr ? `❌ ${updateErr.message}` : '✅')

  // ④ DELETE
  const { error: deleteErr } = await admin.from(TABLE).delete().eq('id', testId)
  console.log('DELETE:', deleteErr ? `❌ ${deleteErr.message}` : '✅')

  // ⑤ RLS テスト（Anon Key）
  const { data: anonData } = await anon.from(TABLE).select('*').limit(1)
  console.log('RLS READ:', anonData?.length === 0 ? '✅ 0件（RLS有効）' : '⚠️ データ取得あり')

  const { error: anonInsertErr } = await anon
    .from(TABLE)
    .insert({ id: randomUUID(), /* ...必須カラム */ })
  console.log('RLS INSERT:', anonInsertErr ? '✅ 拒否（RLS有効）' : '⚠️ 挿入成功')
}

main()
```

実行:

```bash
npx tsx scripts/test-supabase-connection.ts
```

### Step 4: アプリケーション起動確認

```bash
pnpm install   # 依存パッケージの再インストール
pnpm run dev   # 開発サーバー起動
```

ブラウザで `http://localhost:3000` にアクセスし、画面が表示されることを確認。

### Step 5: 本番環境の確認（該当する場合）

- Vercel / その他ホスティングの環境変数が最新か確認
- デプロイを再実行（必要に応じて）
- 本番 URL でのヘルスチェック

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|-------|------|------|
| `PGRST301: JWSError` | JWT Secret の不一致 | Dashboard から最新の JWT Secret を取得し `.env.local` を更新 |
| `relation "xxx" does not exist` | マイグレーション未適用 | `database/migrations/` 配下の SQL を Supabase SQL Editor で実行 |
| `violates foreign key constraint` | テストデータの参照先が存在しない | 外部キーのあるカラムは `null`（許容される場合）または既存の有効な ID を使用 |
| `violates not-null constraint` | スキーマ変更で必須カラムが追加されている | テーブル定義を再確認し、テストデータに必須カラムを追加 |
| `new row violates row-level security policy` | RLS が有効で認証なし | Service Role Key を使用するか、認証済みユーザーで実行 |
| `fetch failed` / `ECONNREFUSED` | プロジェクトがまだ復旧中 | Dashboard でステータスを確認し、数分待ってリトライ |
| `module.exports is not defined in ES module` | `"type": "module"` と CJS の競合 | `.js` → `.cjs` にリネーム、または `export default` に書き換え |

## チェックリスト

```
[ ] Supabase Dashboard でプロジェクトが Active
[ ] 環境変数が最新の値と一致
[ ] Service Role Key で CRUD 成功
[ ] Anon Key で RLS が機能（未認証アクセス遮断）
[ ] アプリケーションが起動し画面表示される
[ ] （本番）デプロイ環境の環境変数も更新済み
```
