## ASCII 正規化 対応 2025-10-16

### 追加
- DB: `database/migrations/20251016_add_ascii_columns.sql`（profiles/address_book に *_ascii 追加）
- Lib: `src/lib/text/toAsciiForShipping.ts`（NFKC→半角→ホワイトリスト→縮約→trim→長さ制限）
- UI: `src/components/AsciiPreviewField.tsx`（読み取り専用プレビュー）

### 更新
- MyPage: `src/app/mypage/profile/page.tsx`（ASCIIプレビュー）/ `actions.ts`（保存時ASCII化）
- Admin: `src/app/admin/company-info/page.tsx`（ASCIIプレビュー）
- AddressBook API: `src/app/api/address-book/route.ts` / `[id]/route.ts`（保存時ASCII化・GETで返却）
- Ship API: `src/app/api/ship/create/route.ts`（*_ascii優先）

### テスト
- Contract: `tests/contracts/mypage.profile.ascii.contract.test.ts`（ユーティリティ基本確認）

### 既知の限界
- ローマ字変換は簡易（wanakana未導入）。必要に応じて依存追加で改善可能。
- 日本語全除去のため、氏名等はローマ字入力を推奨（UIではASCIIプレビューで確認可能）。


