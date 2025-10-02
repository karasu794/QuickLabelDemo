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

## Configuration
### Supabase Setup
- Role: SDK/型生成/認証URL
- Notes: `supabase gen types` を**プリフライトで必ず更新**

### Vercel Env / PDF Setup
- Role: 環境変数/ランタイム設定
- Notes: Service Role Key は**クライアント禁止**

## Observability
- Role: SLI/SLO 定義の所在（→ SLO-SLI.md）
