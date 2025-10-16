## Address Book (Personal Only)

### 可視範囲
- 本人のみ（`user_id` もしくは `created_by` が自分と一致）
- 組織共有（`org_id`）は採用しない

### API
- GET `/api/address-book`
- 認証必須（未認証は 401）
- フィルタ: `or(user_id.eq.<uid>,created_by.eq.<uid>)`
- 返却: 既存DTO互換（`contact_name` → `name` 等のマッピングはUI側で対応）

### RLS
- `public.address_book` は RLS 有効
- ポリシー: select/insert/update/delete 全て本人のみ
- 推奨インデックス: `(user_id)`, `(created_by)`

### テスト
- Contract: 本人のみ返る／未認証は 401／0件は空配列
- E2E: ログインユーザーの保存先のみ表示・選択反映


