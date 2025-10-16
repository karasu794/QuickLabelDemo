## 利用規約・規約バージョン更新（同意トラッキング）

- **主な責務**: サインアップ時の規約・プライバシー同意の取得、規約本文の提示、将来のバージョンアップ時の再同意導線を提供。

- **構造概要**:
  - **UI**: `src/app/terms/page.tsx`（本文表示のプレースホルダ）
  - **フォーム**: `src/app/signup/SignUpForm.tsx`（チェックボックス: 利用規約/プライバシー）
  - **バリデーション**: `src/lib/validators/auth.ts`（`termsAccepted`/`privacyAccepted` を必須）

- **主な関数・ロジック**:
  - サインアップ時に `termsAccepted === true` を必須化。未同意の場合はクライアントでエラー表示
  - 将来拡張: `terms_consents(user_id, version, agreed_at)` を新設し、規約バージョン更新時に再同意を要求

- **Supabase参照情報**:
  - 現行は同意の永続化テーブルなし。将来拡張で `terms_consents` を想定

- **注意点・備考**:
  - 規約本文は `/terms` ページを差し替え可能（MDX/外部URLも可）
  - 既存ユーザーの再同意は段階的適用（バナー/ブロッカー/期限）を想定


