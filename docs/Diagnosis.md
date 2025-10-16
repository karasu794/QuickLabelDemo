## FQL-DATA-REQ 診断（住所・氏名・会社情報のASCII正規化 対応範囲）

### 対象UI

- Admin 自社情報設定: `src/app/admin/company-info/page.tsx`
  - フォーム: 担当者名/会社名/税務番号/郵便番号/住所1/住所2/電話/メール
  - 保存: Server Action `updateCompanyInfoAction` で `app_settings` に保存
  - 現状: ASCIIプレビュー/正規化は未実装

- MyPage プロフィール: `src/app/mypage/profile/page.tsx`, `src/app/mypage/profile/actions.ts`
  - 取得: `profiles` から `select('*')`
  - 更新: `profiles.update({...})`
  - 現状: 氏名/会社名/電話/住所（結合表示）を編集、ASCII保存は未実装

- 住所帳（ピッカーUI）:
  - `src/components/address/AddressBookPicker.tsx` → `/api/address-book` から取得
  - `src/components/address/AddressHistoryPicker.tsx` → `/api/history/addresses` から取得
  - 新規登録・更新UIは別途（APIは存在）

- 送り状入力（差出人/荷受人）:
  - 差出人: `src/app/shipping/new/shipper/page.tsx`
  - 荷受人: `src/app/shipping/new/recipient/page.tsx`
  - 共通ストア: `src/store/shippingFormStore.ts`
  - 現状: 日本語入力OK。ASCIIプレビュー/正規化は未実装
  - 参考フック: `src/hooks/useAsciiValidation.ts`（非ASCIIを検出するだけ、変換は未実装）

### API/サービス

- プロフィール更新: `src/app/mypage/profile/actions.ts`
  - `profiles` を `.update(...)`。ASCII列なし

- 住所帳 CRUD:
  - POST/GET: `src/app/api/address-book/route.ts`
  - PATCH/DELETE: `src/app/api/address-book/[id]/route.ts`
  - 型/項目: `contact_name, company_name, phone_number, country_code, postal_code, state_code, city, address1, address2`
  - 現状: ASCII正規化は未実装

- ラベル発行（FedEx ペイロード組み立て）:
  - 直発行: `src/app/api/ship/route.ts` → `buildBaseFedExShipmentRequest(...)`
  - もう一系統: `src/app/api/ship/create/route.ts`（payload内で `input.shipper.*` / `input.recipient.*` をそのまま使用）
  - Open Ship: `src/app/api/open-ship/create/route.ts` → `src/lib/fedex/open-ship.ts`
  - 現状: 氏名/会社/住所/都市/州/郵便/電話はUI/ストアの値をそのまま使用。ASCII正規化値の優先利用は未実装

### DB（スキーマ/RLS/トリガ）

- `profiles`（`src/types/supabase.ts` 定義）
  - 列（抜粋）: `full_name, company_name, phone_number, address_prefecture, address_city, address_line1, address_line2, postal_code`
  - RLS: `database/enable_profiles_rls.sql`（ownerのみ）
  - マイグレーション: `database/add_profile_fields.sql`（追加列）
  - 現状: `*_ascii` 列なし

- `address_book`
  - 作成: `database/create_address_book_table.sql`
  - RLS: `database/migrations/20251007_rls_address_book.sql`、`20251013_rls_address_book_personal_only.sql`
  - 列: `contact_name, company_name, phone_number, country_code, postal_code, state_code, city, address1, address2, user_id, created_by`
  - 現状: `*_ascii` 列なし

- `shipments`
  - 列（抜粋）: `shipper_* / recipient_*` フラット列、および JSONB `shipper/recipient`
  - 追加: `database/alter_shipments_table.sql`, `database/improve_shipments_table.sql`
  - 現状: `*_ascii` 列なし

- `drafts`
  - 作成: `database/create_drafts_table.sql`
  - RLS: 有効、ownerポリシー
  - 現状: `*_ascii` 列なし

- `app_settings`
  - 作成: `database/create_app_settings_table.sql`（RLSあり）
  - Admin UI: `src/app/admin/company-info/page.tsx` 経由で利用（`/api/settings` も別用途で存在）

### 既存テスト

- Contract:
  - 住所帳: `tests/contracts/features.address_book.contract.test.ts`
  - FedEx（MPS）: `tests/contracts/fedex.mps.contract.test.ts`
  - API包括: `tests/contracts/api.contract.test.ts`
  - RLS/DB: `tests/contracts/db.rls.contract.test.ts`, `tests/contracts/db.contract.test.ts`

- E2E:
  - 決済と出荷: `tests/e2e/payment_ship.spec.ts`

### 現状フロー要約（保存/利用）

- 画面入力: 日本語OK（Admin/MyPage/住所帳/送り状UI）
- 保存: そのまま `profiles` / `address_book` / `drafts` へ保存（ASCII正規化なし）
- 利用: FedExリクエストの `shipper/recipient` にストア値を直接使用（ASCII優先ロジックなし）

### ギャップ（目標との差分）

- DBに `*_ascii` 列が存在しない（対象: `profiles`, `address_book`, `shipments`, `drafts`, 必要に応じ `app_settings`）
- 画面に「ASCIIプレビュー」欄がない（Admin/MyPage/送り状UI）
- 保存時のASCII正規化処理が未実装（UI側 or サーバー側）
- ラベル発行時にASCII正規化値を優先使用する実装がない（安全フォールバックも未実装）
- テストに「日本語→保存→ASCII保存→ラベルでASCII使用」を担保する項目がない

### 関連ソース参照

```30:172:src/app/admin/company-info/page.tsx
async function getCurrentCompanyInfo(): Promise<{ companyInfo: CompanyInfo; error?: string }> {
  // ...
}

async function updateCompanyInfoAction(formData: FormData) {
  'use server'
  // 入力読取り・バリデーション
  // supabaseAdmin.from('app_settings').upsert(...)
}
```

```1:122:src/app/mypage/profile/actions.ts
export async function updateProfile(userId: string, profileData: ProfileData) {
  // supabase.from('profiles').update({...})
}
```

```24:97:src/app/api/address-book/route.ts
export async function POST(request: NextRequest) {
  // address_book INSERT
}

export async function GET() {
  // address_book SELECT （本人のみ）
}
```

```27:74:src/app/api/address-book/[id]/route.ts
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // address_book UPDATE
}
```

```156:520:src/app/api/ship/route.ts
function buildBaseFedExShipmentRequest(data: ShipmentRequest) {
  // requestedShipment.shipper / recipients にストア値を使用（ASCII変換なし）
}
```

```224:271:src/app/api/ship/create/route.ts
// payload.requestedShipment.shipper/recipients に input をそのままセット
```

```1:63:src/hooks/useAsciiValidation.ts
// 非ASCIIの検出（バリデーション）。自動変換は未提供
```

### 結論（Phase 0）

- 影響範囲は Admin 自社情報、MyPage プロフィール、住所帳、送り状入力（差出人/荷受人）、発送API（ship/ship-unified/open-ship）および `profiles/address_book/shipments/drafts` のスキーマ。
- 現状、ASCII正規化は未導入。`*_ascii` 列の追加と、保存時変換・ラベル時優先使用・プレビューUI・自動テストの追加が必要。


