## ユーザー資産（レターヘッド / 署名 / 自動適用ロジック）

- **主な責務**: 管理者/ユーザーがアップロードしたレターヘッド・署名画像を保存・取得し、PDF生成時に適用。Phoenix専用（FORCE）設定で上書き。

- **構造概要**:
  - **UI**: インボイス画面 `src/app/shipping/new/invoice/page.tsx`、セクション `LetterheadSignatureSection.tsx`
  - **API**:
    - Admin: `src/app/api/admin/assets/letterhead/route.ts`, `src/app/api/admin/assets/signature/route.ts`
    - MyPage: `src/app/api/mypage/assets/letterhead/route.ts`, `src/app/api/mypage/assets/signature/route.ts`
    - 設定取得/更新: `src/app/api/admin/settings/route.ts`
  - **lib**:
    - 効力決定: `src/lib/letterhead/getEffectiveLetterhead.ts`, `src/lib/signature/getEffectiveSignature.ts`
    - 設定: `src/lib/settings/getAppSettingBoolean.ts`

- **主な関数・ロジック**:
  - `getEffective*` は `FORCE_PHOENIX_*` が有効なら管理資産を優先、無効ならユーザー資産→管理資産の順で解決
  - Admin/MyPage APIは Supabase Storage にアップロード→公開URL取得→DB（`admin_assets_*` / `user_*`）へ記録
  - PDF生成時に解決済みURLを `IInvoicePdfBuilder` に渡す

- **Supabase参照情報**:
  - テーブル: `app_settings`, `admin_assets_letterhead`, `admin_assets_signature`, `user_letterheads`, `user_signatures`
  - 主要カラム: `storage_url`, `file_name`, `content_type`, `uploaded_by`/`user_id`, `is_default`
  - RLS: user_* はowner CRUD、admin_* は管理者のみ、`app_settings` は認証読み取り/Service Role更新

- **注意点・備考**:
  - 環境変数: `FORCE_PHOENIX_LETTERHEAD`, `FORCE_PHOENIX_SIGNATURE` はDB上書きが優先。ENVはデフォルト扱い
  - アップロードはMIME/サイズ制限あり（PNG/JPEG、上限は実装参照）
  - 将来の選択UI（複数資産からの選択）に備え、`is_default` と作成日時で解決


