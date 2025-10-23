# FQL Projects Setup (Solo Dev)

> 個人開発前提の軽量構成。Staging/R&D の2プロジェクトで運用。
## Projects Summary
- **FQL-Staging**: 実装・テスト・Cursor / My GPTs / Vercel で使用
- **FQL-R&D**: 実験用。構成変更や新GPTテストはこちらで検証

## プロジェクトとキー

| Env | OpenAI Project | API Key (name) | 用途 |
|-----|----------------|----------------|------|
| staging | FQL-Staging | FQL_STAGING_APP_KEY | Vercel / Cursor / My GPTs |
| rnd | FQL-R&D | FQL_RND_SANDBOX_KEY | ローカル実験用 |

- **ACTIONS_TOKEN**: My GPTs Actions 認証用（Bearer）。Staging 環境に設定。
- **.env 切替**: `cp .env.local.stg .env.local` / `cp .env.local.rnd .env.local`

## 変数一覧（.env / Vercel）
```bash
# --- OpenAI ---
OPENAI_API_KEY=        # 各環境のProject Key
ACTIONS_TOKEN=         # My GPTs Actions認証
APP_ENV=staging        # or rnd
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=


## 疎通チェック（OpenAI API）
- ローカル: `npm run ping:openai`
- Vercel(Preview): `npm run ping:openai:web`（ベースURL指定）

## 鍵ローテーション手順
1. 新キー発行（OpenAI Dashboard）
2. Vercel に新旧2本を一時併存
3. デプロイ→`/api/dev/health` が 200 で新キー検知
4. 旧キー削除
5. 本書に日時と実施者を追記

## 参考
- `/api/dev/health` は `{ok, env, openai, supabase, guarded, ts}` を返す
- Guard 導入時は Bearer 未指定で 401、指定で 200

## 安全運用メモ
- FQL-Staging: 月額上限 \$100 程度、Code Interpreter / File Search は無効化
- FQL-R&D: 月額上限 \$200 程度、重機能（Code Interpreter / File Search / Assistants Write）を許可
- 環境切替時は `APP_ENV` を確認して誤送信防止
- `ACTIONS_TOKEN` は Bearer ヘッダ経由でのみ使用、ログやGitに残さない
