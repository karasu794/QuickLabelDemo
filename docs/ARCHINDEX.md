# ARCHINDEX — Project Structure Index

> 目的: Cursor/人間が“最小コスト”で全体像を把握するための要約インデックス。
> 粒度: 1ファイル=最大5行。Role / Exports / Depends / Effects / Notes を短句で。

## 0. Overview
- Stack: Next.js App Router / TypeScript / Supabase (RLS) / Zod / Vercel
- Directories: `app/` (routes, UI), `lib/server/` (context/repos/tx), `components/`, `types/`, `scripts/`

## 1. Auth & Context
- `src/lib/server/context.ts`
  - Role: リクエストごとの userId/orgId/role を確定
  - Exports: `getRequestContext(req): RequestContext`
  - Depends: supabase-auth, profiles, organization_members
  - Effects: READ profiles/org_members
  - Notes: orgId は**ctxのみ**から取得（外部入力禁止）

## 2. Middleware
- `src/middleware.ts`
  - Role: 認証前段、追跡ID付与、地域/言語
  - Exports: (n/a)
  - Depends: next/server
  - Effects: none
  - Notes: 未認証時のハンドリングは route 側で 401/403 を返す方針

## 3. API Routes（代表のみ。追加は同形式）
- `src/app/api/ship/create/route.ts`
  - Role: 送り状作成
  - Exports: POST
  - Depends: `repos/shipments`, zod
  - Effects: WRITE shipments / ExternalAPI FedEx (TX外)
  - Notes: Input/Output は Zod 契約名を先頭に記載

## 4. Server Repositories（1テーブル=1モジュール）
- `src/lib/server/repos/shipments.ts`
  - Role: shipments CRUD（org スコープ）
  - Exports: `listByOrg(ctx, filters)`, `create(ctx, input)`
  - Depends: types/supabase, withTx
  - Effects: READ/WRITE shipments
  - Notes: **ctx 第一引数必須**

## 5. External Integrations
- FedEx Client / Google Maps / PDF generation(Vercel)
  - Role/Notes を1行で列挙

## 6. UI & Components（代表のみ）
- `src/app/ship/create/page.tsx` … Role/Depends/Effects(なし) を1行

## 7. Ops Notes / Platforms
- Vercel env / PDF constraints / feature flags の所在リンク

## 8. Hazard Shortlist（危険短句）
- 「route.ts で直 `supabase.from` 禁止」
- 「orgId/userId を外部入力で受けない」
- 「外部APIは TX外」
- 「名目型ID（UserId/OrgId）混同禁止」

> 追加方法: 節をコピーして追記。Effects は I/O(DB/外部API)のみ簡潔に。
