# ARCHINDEX (Architecture Index)

## Overview
- Stack: Next.js (App Router) / TypeScript / Supabase (RLS)
- Goal: 全体構造の“入口”を1ファイルに集約。Cursorはまず本書の**対象ディレクトリ章**を読む。

## 読み方（必読）
各エントリは以下のキーを持つ：
- Role（役割1行） / Exports（公開） / Depends（主依存） / Effects（I/O/外部API） / Notes（前提・認証/認可）

## 目次
- Auth & Context
- API Routes
- Server Repositories
- External Integrations (FedEx / Google Maps / PDF)
- UI & Responsive
- Configuration (Supabase / Vercel)
- Observability

---

## Auth & Context
### src/lib/server/context.ts
- Role: リクエストから userId/orgId/role/trace を構築する単一路
- Exports: getRequestContext(req): Promise<RequestContext>
- Depends: supabase-js, server-only
- Effects: READ profiles/organization_members
- Notes: orgIdの決定は**サーバ由来のみ**。クライアント入力で上書き禁止。

### src/middleware.ts
- Role: 認証ゲート（401/403分岐）
- Exports: middleware(req)
- Depends: next/server
- Effects: none
- Notes: 未認証=401 / org未決=403 の原則

## API Routes
### src/app/api/ship/create/route.ts
- Role: 送り状作成（1pkg, 本番想定）
- Exports: POST(req)
- Depends: zod, repos/shipments, withTx
- Effects: WRITE shipments / External FedEx
- Notes: 冪等性=order_id+advisory lock

（※ 他のAPIも同フォーマットで追記）

### /api/ship/create (1pkg)
- Role: 送り状作成（本番想定）
- Depends: zod, repos/shipments, withTx, FedEx client
- Effects: WRITE shipments / External FedEx
- Notes:
  - **冪等性**: `order_id` + advisory lock
  - 外部API呼び出しは**TX外**
  - 失敗時は再試行（指数バックオフ）＋リカバリログ
  - サーバ側のSupabaseクライアントは `@/lib/supabase/server` のラッパを使用（直 import/直生成は禁止）。
  - DBアクセスは Repository 経由で行い、route 直下での `.from()` 呼び出しは避ける。

## Server Repositories
### src/lib/server/repos/shipments.ts
- Role: shipments テーブルアクセス（1テーブル=1モジュール）
- Exports: listByOrg(ctx,…), create(ctx,…)
- Depends: supabase-js, types/supabase
- Effects: READ/WRITE shipments
- Notes: **ctx第一引数必須**。直 supabase 呼び出しは禁止。

（※ 他テーブルも追記）

## External Integrations
### FedEx Client
- Role: 運送ラベル取得
- Effects: External API（**TX外**で呼ぶ）

### Google Maps
- Role: 住所補完
- Notes: Autocomplete 初期化は useCallback 必須

### PDF Generation
- Role: PDF 作成（Vercel対応）
- Notes: Noto Sans JP / メモリ・タイムアウト制約

## UI & Responsive
- Role: 主要画面のレスポンシブ指針（カード化/横スクロールなど）
- Notes: 管理UIはモバイルでカード化優先

### /app/ship/create
- Role: 送り状作成UIのレスポンシブ対応
- Notes:
  - モバイルは**カード化優先**、横スクロールテーブルは避ける
  - 入力フォームはフィールド分割（タブ/アコーディオン）で高さ圧縮

### Admin Tables
- Role: 管理UIの表表示
- Notes:
  - 横幅不足時は**カード化**へフォールバック
  - 広画面ではテーブル＋固定ヘッダ、モバイルは行カード
  - Switcherコンポーネントは `types.ts` に型/定数を抽出し、page ↔ 子間の循環参照を禁止（単方向参照）。

## Auth UX
### Idle Timeout / Persistent Login
- Role: セッションUXの基本方針
- Notes:
  - Idle Timeout: 管理画面=15分 / 決済=5分
  - Persistent Login: 管理者は**一時ログイン推奨**、一般ユーザーは長期ログイン許可

## Auth
### Supabase Duplicate Email
- Role: サインアップ時の重複メール仕様
- Notes:
  - Supabase側は**silent fail**になりうる → **クライアント側で重複検知必須**
  - UIは「すでに登録済みの可能性」の案内＆ログイン導線を表示

## Configuration
### Supabase Setup
- Role: SDK/型生成/認証URL設定
- Exports: supabase client (singleton)
- Depends: supabase-js, env vars
- Notes:
  - `supabase gen types` をプリフライトで必ず実行（型差分があればZod更新必須）
  - Auth callback URL: http://localhost:3000/auth/callback (dev)
  - 重複メールはSupabase仕様により silent fail → クライアント側で検知
  - 認証メールは日本語化済みテンプレートを利用
  - 
- Role: SDK/型生成/認証URL
- Notes: `supabase gen types` を**プリフライトで必ず更新**

### Vercel Environment
- Role: プロダクション環境変数の定義・管理
- Depends: Vercel Project Settings (Environment Variables)
- Notes:
  - 必須: SUPABASE_URL / SUPABASE_ANON_KEY / (Server) SUPABASE_SERVICE_ROLE_KEY
  - FedEx / Google Maps / SITE_URL などの外部キーを**デプロイ前に**設定
  - **Service Role Key はサーバ専用**（クライアントでは使用禁止）

### PDF Generation (Vercel)
- Role: 領収書/帳票PDFの生成
- Depends: Chromium (Vercel), Noto Sans JP
- Effects: CPU/メモリ使用（タイムアウト制約あり）
- Notes:
  - フォント: **Noto Sans JP** をバンドル or 事前ロード
  - タイムアウト/メモリ制約に注意（重いページは分割/遅延）
  - 失敗時は再試行（指数バックオフ）、ログ記録

## Observability
- Role: SLI/SLO 定義の所在（→ SLO-SLI.md）

## Observability / Testing
- Notes:
  - 上記 Guardrails のテスト由来ルールは **最小契約テスト** (#6) に反映する
  - E2E スモークは「決済/発行/キャンセル」の3本を優先