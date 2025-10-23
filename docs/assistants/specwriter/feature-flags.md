# Feature Flags — 台帳（SpecWriter用）

本書は機能フラグの一次台帳です。ENV 名・既定値・影響範囲・依存を正規化し、コード実装と照合可能な形で管理します。推測は行わず、未確定は TODO として明記します。

## 運用方針

- 種別: Release / Experiment / Ops（`docs/feature-flags.md` の分類に準拠）
- Cleanup: Release/Experiment は期限必須（UTC, YYYY-MM-DD）。
- 参照: UI での可視化/分岐、API ガード、RLS/デプロイ前提との関係を明示。

## フラグ一覧（ENV）

| Flag | Scope | Type | Default | Description | Referenced In |
|---|---|---|---|---|---|
| SHIP_API_WRITE_ENABLED | API | Ops | false | 出荷書き込みの全体停止。true のときのみ `/api/ship/create` が書き込み実行 | `src/app/api/ship/create/route.ts` |
| REQUIRE_RATE_MATCH | API | Ops | true | RateGuard必須。参照合計なし/超過時に 4xx | `src/lib/ship/rateGuard.ts` |
| RATE_GUARD_MAX_PCT | API | Ops | TODO | RateGuard 許容率（0..1）| `src/lib/ship/rateGuard.ts` |
| RATE_GUARD_MAX_ABS | API | Ops | TODO | RateGuard 許容絶対額（JPY等）| `src/lib/ship/rateGuard.ts` |
| RATE_MATCH_PERCENT_TOLERANCE | API | Deprecated | - | 旧名（後方互換フォールバック）| `src/lib/ship/rateGuard.ts` |
| RATE_MATCH_YEN_TOLERANCE | API | Deprecated | - | 旧名（後方互換フォールバック）| `src/lib/ship/rateGuard.ts` |
| FEATURE_REVIEW_DISCLAIMER | UI | Release | true | 注文確認画面の免責事項表示/検証 | `src/lib/config/featureFlags.ts` |
| FEATURE_HTS_SUGGESTIONS | API/UI | Experiment | false | HTS候補API/UIの有効化 | `src/app/api/hts/suggest/route.ts`, `src/lib/hts/suggest.ts` |
| NEXT_PUBLIC_FEATURE_HTS_SUGGESTIONS | UI | Experiment | false | クライアントUI表示用（参照箇所: TODO）| TODO |
| NEXT_PUBLIC_ENABLE_NEW_LOGIN | UI | Experiment | false | 新ログインUIの有効化 | `src/app/login/page.tsx`, `src/app/login/LoginFormNew.tsx` |
| NEXT_PUBLIC_ENABLE_AUTHGUARD_REDIRECT | UI | Experiment | false | AuthGuard の自動リダイレクト有効化 | `src/components/AuthGuard.tsx` |
| ACTIONS_TOKEN | API | Ops | unset | Dev/診断APIの Bearer 認証トークン | `src/middleware.ts`, `/api/dev/health`, `/api/diagnostics/runtime-logs`, `/api/run-e2e` |
| BLOB_READ_WRITE_TOKEN | API | Ops | unset | ラベルPDFのBLOB保存トークン | `/api/ship/create` |

備考:

- `docs/feature-flags.md` は人手運用の一覧。SpecWriter向けの本書はコード実装と照合された正規化台帳です。
- 既定値は `env.example` を優先。未定義は TODO。

## 影響範囲マトリクス

| Flag | UI | API | Guard/MW | DB/RLS | Release 手順 | Rollback |
|---|---|---|---|---|---|---|
| SHIP_API_WRITE_ENABLED | - | /api/ship/create 書き込み抑止 | - | - | 値=trueで切替 | 値=false で即時復帰 |
| REQUIRE_RATE_MATCH / RATE_GUARD_* | - | RateGuard の 4xx/警告 | - | - | しきい値の段階適用 | 旧名キーへフォールバック |
| FEATURE_REVIEW_DISCLAIMER | 表示/同意UI | - | - | - | ON/OFFでUI確認 | 単純OFF |
| FEATURE_HTS_SUGGESTIONS | 表示/候補 | GET /api/hts/suggest | - | - | Feature behind login | OFFで無効化 |
| NEXT_PUBLIC_ENABLE_NEW_LOGIN | 新UI | - | - | - | プレビュー → 本番ON | OFFで旧UI |
| NEXT_PUBLIC_ENABLE_AUTHGUARD_REDIRECT | ルーティング | - | 中間層なし | - | 小規模ON/OFF | OFFで無効 |
| ACTIONS_TOKEN | - | Dev/診断API | ミドルウェア | - | 設定/ローテ | 解除で401 |

## 依存/注意

- サーバ側とクライアント側で `NEXT_PUBLIC_*` の露出範囲が異なる。機微キーは `NEXT_PUBLIC_*` を使用しない。
- `RATE_GUARD_MAX_*` が未設定の場合、旧名キーでフォールバック。後方互換の整理は要PR。

---

### Sources

- `docs/feature-flags.md`
- `env.example`
- `src/app/api/ship/create/route.ts`
- `src/lib/ship/rateGuard.ts`
- `src/lib/config/featureFlags.ts`
- `src/app/api/hts/suggest/route.ts`
- `src/lib/hts/suggest.ts`
- `src/middleware.ts`
- `src/app/api/dev/health/route.ts`
- `src/app/api/diagnostics/runtime-logs/route.ts`

Last-Verified: 2025-10-20
