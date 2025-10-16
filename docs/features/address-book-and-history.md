## 住所帳・履歴管理（宛先保存 / 履歴テーブル設計）

- **主な責務**: 住所の保存/取得、過去の出荷からの履歴抽出とピッカーUI提供。

- **構造概要**:
  - **UI**: `src/components/address/AddressHistoryPicker.tsx`、統合先ページ `shipping/new/shipper|recipient`
  - **API**:
    - 住所帳: `src/app/api/address-book/**`
    - 履歴: `src/app/api/history/addresses/route.ts`
  - **DB/マイグレーション**: `database/create_address_book_table.sql`, `database/migrations/20251013_rls_address_book_personal_only.sql`

- **主な関数・ロジック**:
  - 住所帳は本人のみCRUD、AdminはSELECTの方針
  - 履歴は `user_address_history` が0件のとき `open_shipments`/`shipments` から補完、重複排除と最新優先を適用

- **Supabase参照情報**:
  - `address_book` 主カラム: `id, user_id, contact_name, company_name, phone_number, country_code, postal_code, state_code, city, address1, address2, created_by`
  - RLS: owner CRUD, admin select, service_role full（個人限定方針に統一）
  - 履歴ソース: `open_shipments(shipper_info/recipient_info)` JSONB, `shipments` の住所列

- **注意点・備考**:
  - 組織共有は採用しない。`alter_address_book_org_rls.sql` は旧方針の痕跡
  - UIは `data-test` を付与してE2Eで可視性/選択結果を検証
  - CSVテンプレートAPI/アップロードAPIはUI連携時に参照


