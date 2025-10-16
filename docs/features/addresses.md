## 荷受人・差出人情報入力（住所帳統合）

- **主な責務**: 差出人/荷受人の住所・連絡先入力、住所帳/履歴からの選択、見積もり/出荷フローへの引き渡し。

- **構造概要**:
  - **UI**:
    - 差出人: `src/app/shipping/new/shipper/page.tsx`
    - 荷受人: `src/app/shipping/new/recipient/page.tsx`
    - 履歴ピッカー: `src/components/address/AddressHistoryPicker.tsx`
  - **API**:
    - 住所帳: `src/app/api/address-book/route.ts`, `src/app/api/address-book/[id]/route.ts`, `src/app/api/address-book/upload/route.ts`, `src/app/api/address-book/template/route.ts`
    - 履歴: `src/app/api/history/addresses/route.ts`
  - **lib/hooks**: Zustand `useShippingFormStore`（差出人/受取人/パッケージ一元管理）

- **主な関数・ロジック**:
  - 履歴は `open_shipments`/`shipments` からの派生と `user_address_history`（存在する場合）を統合し、重複排除・直近優先
  - UIの選択でストアに即時反映、送信時に最終検証（国/郵便/州コードなど）

- **Supabase参照情報**:
  - `address_book`（RLS有効）
    - 主カラム: `id, user_id, contact_name, company_name, phone_number, country_code, postal_code, state_code, city, address1, address2, created_by, org_id(移行中)`
    - RLS: 個人のみアクセス（owner CRUD, admin select, service_role full）。個人専用強化版マイグレーションあり
  - 履歴: `open_shipments` の `shipper_info` / `recipient_info` JSONB, `shipments` のフラット列を参照

- **注意点・備考**:
  - 住所帳RLSは「個人限定」方針に統一（`20251013_rls_address_book_personal_only.sql`）。org共有は不採用
  - APIはSupabase cookie認証前提。テストでは `X-Test-Bypass-Auth` を利用可能な場合あり
  - UI/E2Eは data-test 属性で検証（ボタン/モーダル/空状態）


