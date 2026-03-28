# FQL デモ環境 — ポートフォリオ体験確認 & データ整備計画

## 1. 主要導線チェックリスト（画面単位）

### 未ログイン状態
| # | 画面 | 確認内容 | 期待動作 |
|---|------|----------|----------|
| 1 | `/` トップ（見積もり） | 見積もりフォーム表示、入力→送信→料金表示 | FedEx sandbox API で実レート返却 |
| 2 | `/login` | ログインフォーム表示・認証 | Supabase Auth でログイン成功 |
| 3 | `/signup` | 新規登録フォーム表示 | 登録→メール確認フロー |
| 4 | DemoBanner | 全ページ上部にアンバーバナー表示 | 「🚧 デモ環境」が常時表示 |

### ログイン後 — ユーザー導線
| # | 画面 | 確認内容 | 期待動作 |
|---|------|----------|----------|
| 5 | `/` 見積もり | ログイン状態で見積もり→料金選択 | 料金一覧表示、「この料金で発送」ボタン |
| 6 | `/shipping/new/shipper` | 荷送人情報入力、住所帳・履歴ピッカー | Google Places 動作、フォーム入力可 |
| 7 | `/shipping/new/recipient` | 荷受人情報入力 | 同上 |
| 8 | `/shipping/new/packages` | 荷物情報入力（重量・寸法） | バリデーション動作 |
| 9 | `/shipping/new/contents` | 内容品入力、HSコード | HTS検索動作（US宛） |
| 10 | `/shipping/new/service` | サービス選択（有効時） | 料金比較表示 |
| 11 | `/shipping/new/review` | 確認画面→決済→ラベル発行 | **決済: DEMO_MODE_DISABLED で 403** |
| 12 | `/mypage/profile` | プロフィール表示・編集 | 読み書き正常 |
| 13 | `/mypage/history` | 配送履歴・見積もり履歴 | ダミーデータ表示、再利用ボタン動作 |
| 14 | `/mypage/receipts` | 領収書一覧・PDF表示 | ダミー取引の領収書表示 |

### 管理者導線
| # | 画面 | 確認内容 | 期待動作 |
|---|------|----------|----------|
| 15 | `/admin` | ダッシュボード表示 | 管理メニュー一覧 |
| 16 | `/admin/users` | ユーザー一覧 | テーブル表示、BAN/削除は DEMO_MODE_DISABLED |
| 17 | `/admin/fees` | 手数料設定 | 設定画面表示 |
| 18 | `/admin/transactions` | 取引履歴一覧 | ダミー取引表示 |
| 19 | `/admin/notifications` | 通知管理 | 通知一覧表示 |
| 20 | `/admin/company-info` | 会社情報 | 表示・編集 |

---

## 2. 危険データ洗い出し観点

### 即座に確認・対処が必要
| 観点 | テーブル | リスク | 対処 |
|------|---------|--------|------|
| 実メールアドレス | `profiles` | 個人情報漏洩 | デモ用ダミーに差し替え |
| 実電話番号 | `profiles`, `address_book`, `shipments` | 個人情報漏洩 | ダミー番号に差し替え |
| 実住所 | `address_book`, `shipments` | 個人情報漏洩 | 架空住所に差し替え |
| 実決済ID | `shipments` | Square sandbox IDなら問題なし | sandbox IDか確認 |
| 実追跡番号 | `shipments` | FedEx sandbox番号なら問題なし | sandbox番号か確認 |
| `.env.local` の認証情報 | — | API キー漏洩 | デプロイ時は環境変数で注入、gitignore確認 |
| `ADMIN_EMAILS` / `ADMIN_PASSWORD` | `.env.local` | 認証情報 | デモ用に変更 or 環境変数注入 |
| `E2E_EMAIL` / `E2E_PASSWORD` | `.env.local` | 認証情報 | 同上 |

### 後回しでOK
| 観点 | テーブル | リスク | 備考 |
|------|---------|--------|------|
| 古い見積もりジョブ | `quote_jobs` | 低（payload内に住所あり得る） | 量が多ければ truncate |
| 下書きデータ | `drafts` | 低（途中入力） | 不要なら削除 |
| 通知データ | `notifications` | なし | そのまま or ダミー追加 |

---

## 3. ダミーデータ最小構成案

### 3-A. ユーザー（profiles）

既存の管理者アカウント（k-jee@hotmail.co.jp）をそのまま使用。
ポートフォリオ公開時は Supabase Auth のメールを表示しない設計にするか、
プロフィール表示名だけダミーにする。

| フィールド | 値 |
|-----------|-----|
| full_name | 山田 太郎 |
| company_name | デモ株式会社 |
| phone_number | 03-0000-0000 |
| address | 東京都港区芝公園4-2-8（架空ビル3F） |

### 3-B. 住所帳（address_book）— 3件

| # | contact_name | company_name | country | city | 用途 |
|---|-------------|-------------|---------|------|------|
| 1 | Tanaka Demo | Demo Corp Tokyo | JP | Tokyo | 国内荷送人 |
| 2 | John Sample | Sample Inc. | US | New York | 米国宛荷受人 |
| 3 | Marie Exemple | Exemple SARL | FR | Paris | 欧州宛荷受人 |

住所詳細（すべて架空）:
- JP: 〒105-0000, 東京都港区サンプル1-1-1, デモビル5F
- US: 10000, 123 Demo Street, Suite 100, New York, NY
- FR: 75000, 1 Rue de l'Exemple, Paris

### 3-C. 配送履歴（shipments）— 3件

| # | 方向 | サービス | 金額 | ステータス | 目的 |
|---|------|---------|------|-----------|------|
| 1 | JP→US | FEDEX_INTERNATIONAL_PRIORITY | ¥18,500 | completed | 電子部品サンプル |
| 2 | JP→FR | FEDEX_INTERNATIONAL_ECONOMY | ¥12,800 | completed | 伝統工芸品 |
| 3 | US→JP | FEDEX_INTERNATIONAL_PRIORITY | ¥22,300 | shipped | 書類・カタログ |

- tracking_number: sandbox形式（例: `794644790000`, `794644790001`, `794644790002`）
- payment_id: `sandbox-demo-pay-001` 〜 `003`
- label_url: ダミーURL or 実際にsandboxで生成したPDF

### 3-D. 見積もり履歴（quote_jobs）— 1〜2件

既存のsandbox見積もり結果があればそのまま残す。
なければ、トップページから実際に見積もりを実行して自然に生成する。

---

## 4. UIメッセージ案

### 4-A. デモガード時のユーザー向けメッセージ

現在のAPI応答（`DEMO_MODE_DISABLED`）はJSON。
フロントエンドでユーザーに見せるメッセージは以下を推奨:

| 場面 | メッセージ | 表示方法 |
|------|----------|----------|
| 決済ボタン押下時 | 「デモ環境のため、決済処理はスキップされます」 | toast.info（青系） |
| ラベル発行ボタン押下時 | 「デモ環境のため、ラベル発行は無効です」 | toast.info |
| キャンセル操作時 | 「デモ環境のため、キャンセル操作は無効です」 | toast.info |
| 管理者: ユーザーBAN/削除 | 「デモ環境のため、この操作は無効です」 | toast.info |

### 4-B. WRITE_DISABLED 時のメッセージ

`SHIP_API_WRITE_ENABLED=false` で返る `WRITE_DISABLED` (503) は
フロントで以下に変換:

| 場面 | メッセージ |
|------|----------|
| ラベル発行API 503 | 「ラベル発行機能は現在メンテナンス中です」 |

### 4-C. review画面での事前表示

決済ボタンの近くに注意書きを常時表示:

```
ℹ️ デモ環境では決済・ラベル発行は実行されません。
   フォーム入力と見積もり取得までの体験をお試しいただけます。
```

### 4-D. DemoBanner（実装済み）

現在: `🚧 デモ環境 — 決済・ラベル発行などの外部連携は無効化されています`
→ このままでOK。簡潔で適切。

---

## 5. 優先順位つきタスクリスト

### 🔴 今すぐ直すべき（ポートフォリオ公開前に必須）

| # | タスク | 理由 | 工数目安 |
|---|--------|------|---------|
| P1 | Supabase内の実個人情報をダミーに差し替え | 個人情報漏洩防止 | 30分 |
| P2 | ダミー配送履歴 3件を INSERT | 履歴画面が空だと機能が伝わらない | 20分 |
| P3 | ダミー住所帳 3件を INSERT | 住所帳ピッカーの動作デモ | 10分 |
| P4 | review画面にデモ注意書き追加 | 決済ボタン押下→エラーだと混乱する | 15分 |
| P5 | DEMO_MODE_DISABLED をフロントで toast.info 表示 | JSON エラーだけだとUX悪い | 20分 |
| P6 | トップページで見積もり実行→正常動作確認 | ポートフォリオの第一印象 | 10分 |

### 🟡 できれば対応（品質向上）

| # | タスク | 理由 | 工数目安 |
|---|--------|------|---------|
| Q1 | プロフィール画面のダミーデータ整備 | プロフィール画面が空だと寂しい | 10分 |
| Q2 | 管理画面の取引一覧にダミーデータ反映確認 | 管理機能のデモ | 5分 |
| Q3 | 領収書PDF生成の動作確認 | PDF機能のアピール | 15分 |
| Q4 | WRITE_DISABLED の503をフロントで自然なメッセージに変換 | UX改善 | 10分 |
| Q5 | 古い quote_jobs / drafts の不要データ削除 | データクリーンアップ | 10分 |

### 🟢 後回しでOK（余裕があれば）

| # | タスク | 理由 |
|---|--------|------|
| R1 | 管理画面の通知にデモ通知を数件追加 | あると見栄えする |
| R2 | CSV一括アップロード画面のデモ対応 | ニッチ機能 |
| R3 | デモ用のスクリーンショット/動画撮影 | ポートフォリオ資料 |
| R4 | Vercelデプロイ設定（APP_ENV=demo） | 公開時に必要 |

---

## 実装の進め方（推奨順序）

1. **P1**: SQLスクリプトで profiles / address_book / shipments の個人情報をダミー化
2. **P2 + P3**: ダミーデータ INSERT スクリプト作成・実行
3. **P6**: devサーバーで見積もりフロー通し確認
4. **P4**: review画面にデモ注意書きコンポーネント追加
5. **P5**: フロントのAPI呼び出し箇所で DEMO_MODE_DISABLED を toast.info に変換
6. **Q1〜Q5**: 順次対応

---

## Vercel デプロイ手順

### 前提
- `.env.vercel-demo.template` にデモ用環境変数テンプレートあり
- `.env.local` の PII は除去済み（2026-03-28）

### 手順

1. **Supabase データ整備**（ローカルから実行）
   ```bash
   npx tsx scripts/demo-seed.ts
   ```
   - profiles / address_book / shipments の実個人情報をダミー化
   - ダミー配送履歴 3件 + ダミー住所帳 3件を投入

2. **Supabase にデモユーザー作成**（Supabase Dashboard > Authentication > Users）
   - `demo-user@fql-demo.example.com` / `DemoUser2026!`
   - `demo-admin@fql-demo.example.com` / `DemoAdmin2026!`
   - 管理者は `profiles.role = 'admin'` に設定

3. **Vercel 環境変数設定**
   - `.env.vercel-demo.template` を参考に、Vercel Dashboard で設定
   - `<your-xxx>` を実際の値に差し替え
   - `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL` はデプロイ後のURLに

4. **デプロイ**
   ```bash
   vercel --prod
   ```

5. **プリフライトチェック**
   ```bash
   npx tsx scripts/demo-preflight.ts
   ```

6. **通し確認**（ブラウザで手動）
   - トップページ見積もり → レート表示
   - デモログイン → 配送フォーム全ステップ → review画面 toast確認
   - マイページ → 履歴・住所帳
   - 管理画面 → ユーザー一覧・取引一覧

### 実装済みチェックリスト

- [x] `APP_ENV=demo` によるデモモード制御
- [x] DemoBanner（全ページ上部）
- [x] 決済 API → `DEMO_MODE_DISABLED` (403)
- [x] ラベル発行 API → `DEMO_MODE_DISABLED` (403)
- [x] キャンセル API → `DEMO_MODE_DISABLED` (403)
- [x] 管理者操作（BAN/削除/停止）→ フロントで `demoToast()` ブロック
- [x] review画面 → 決済 toast + ラベル発行 toast + WRITE_DISABLED toast
- [x] review画面 → デモ注意書き表示
- [x] ログイン画面 → デモ用クイック入力ボタン
- [x] FedEx safety mode (`rate-only`)
- [x] メールマスク (`maskEmail()`)
- [x] PII sanitize SQL (`demo_sanitize_pii.sql`)
- [x] デモシードスクリプト (`demo-seed.ts`)
- [x] `.env.local` から実個人情報除去
- [x] プリフライトチェックスクリプト (`demo-preflight.ts`)
- [x] Vercel環境変数テンプレート (`.env.vercel-demo.template`)
