## 環境設定・トグル制御（Phoenix専用機能の表示制御など）

- **主な責務**: アプリ設定の保管・取得、Phoenix専用のFORCE系トグル（レターヘッド/署名）や機能フラグの反映。

- **構造概要**:
  - **API**: `src/app/api/admin/settings/route.ts`（GET/POSTで `app_settings` を読み書き）
  - **lib**: `src/lib/settings/getAppSettingBoolean.ts`（DB→ENVフォールバックで真偽値取得）
  - **ドキュメント**: `docs/feature-flags.md`（台帳/期限管理）
  - **ENV例**: `env.example`（`FORCE_PHOENIX_LETTERHEAD`/`FORCE_PHOENIX_SIGNATURE`、Square/FedEx鍵）

- **主な関数・ロジック**:
  - `getAppSettingBoolean(key, envDefault)` で DB値が優先、無ければENV→デフォルト
  - Admin設定APIはCookie認証+管理者チェックで `app_settings(key,value:{enabled})` を upsert
  - レターヘッド/署名の強制ONはユーザー資産より管理資産を優先適用

- **Supabase参照情報**:
  - テーブル: `app_settings(key unique, value jsonb, description, created_at, updated_at)`
  - RLS: 認証ユーザーはSELECT、Service RoleのみALL（更新は管理API経由）
  - トリガー: `update_app_settings_updated_at` で `updated_at` 自動更新

- **注意点・備考**:
  - 管理APIは `role='admin' OR is_admin=true` を満たす必要
  - レスポンスに短期キャッシュ（`Cache-Control: private, max-age=60`）を付与
  - フラグはE2E/契約で継続検証し、Cleanup期限を厳守


