## Cursor Workflow (チーム開発フローガイド)

本ガイドは、`/docs/ARCHINDEX.md`、`/docs/Guardrails.md`、`/docs/Release-Runbook.md`、`/docs/SLO-SLI.md`、`/docs/feature-flags.md`、`/README.md` を正準として、Cursor を用いたチーム開発の運用フローを定義します。

## 1. 実装前
- 変更予定のファイルの役割と依存関係を確認
  - 参照: `/docs/ARCHINDEX.md`
  - 理由: 影響範囲を把握し、境界（API/DB/外部サービス）に対する変更の安全性を担保するため
- 再発防止ルールを確認
  - 参照: `/docs/Guardrails.md`
  - 理由: High/Medium ルール違反（例: Service Role の誤用、TX内外部API呼出し）を未然に防ぐため
- 破壊的変更や契約差分（型/Zod/公開I/F）がある場合は「Askゲート」で合意形成
  - 参照: `/docs/ARCHINDEX.md`（該当セクション）・`/docs/Guardrails.md`
  - 理由: 互換性・可用性・SLOへの影響を事前にレビューするため

## 2. Dry-run
- Cursor で差分を Dry-run（提案→差分確認）
  - 参照: `/docs/Guardrails.md`
  - 理由: 不整合やルール逸脱（冪等性、TX境界、UI/認証UXなど）を事前に検出して手戻りを減らすため
- 差分に問題があれば修正、もしくは相談して再実行
  - 参照: `/docs/ARCHINDEX.md`・`/docs/Guardrails.md`
  - 理由: 設計/実装の矛盾を最小コストで是正するため

## 3. 実装
- DB/外部API 境界は repo/ctx 関数を必ず使用
  - 参照: `/docs/ARCHINDEX.md`（Server Repositories / Auth & Context）・`/docs/Guardrails.md`
  - 理由: 直接呼出しの混入を防ぎ、テスタビリティと一貫性を保つため
- 型生成と契約の同期
  - 参照: `/README.md`（typegen）・`/docs/ARCHINDEX.md`（Supabase Setup）
  - 理由: `supabase gen types` と Zod 契約の差分を無くし、型安全性を維持するため
- フラグ運用の登録
  - 参照: `/docs/feature-flags.md`
  - 理由: 段階リリースやカナリア運用の可視化・制御のため

## 4. 実装後
- 運用手順・トラブルシュートの追記
  - 参照: `/docs/Release-Runbook.md`
  - 理由: 運用上の再現性とインシデント対応の短縮のため
- API の SLO/SLI 更新
  - 参照: `/docs/SLO-SLI.md`
  - 理由: 実装差分を可観測性の指標に反映し、品質基準を継続監視するため

## 5. PR提出
- PR テンプレートの `DOC PATCH` を Yes に設定し、対象ドキュメント（`ARCHINDEX` / `Guardrails` / `Release-Runbook` / `SLO-SLI`）の更新要否を明記
  - 参照: `.github/pull_request_template.md`
  - 理由: 実装と正準ドキュメントの乖離を防ぐため
- ドキュメント更新チェックを実行
  - 参照: `scripts/check-docs-updated.js`（存在する場合）
  - 理由: 必要なドキュメントが更新されているかを自動検証するため

### preflight High（直Supabase/循環/E2Eタイムアウト）検出時の対応
- 実装方針: 小差分で安全に修復（例: Supabase生成をラッパ統一、types.ts 抽出で循環解消、E2EはAPIスモーク化）
- 運用: 導入初期は warn（適用は提案PRで合意後）。Askゲートは不要（互換性破壊/DB変更が無い場合）。
- 影響: コードの責務分離とテスタビリティ向上、preflightのHigh=0を維持

## 6. α運用・差し戻し
- α環境で運用テスト（スモーク）を実施
  - 参照: `/docs/SLO-SLI.md`・`/docs/Release-Runbook.md`
  - 理由: 本番影響前に主要経路の品質を担保するため
- 差し戻しがあればガイドを更新
  - 参照: `/docs/Guardrails.md`・`/docs/Release-Runbook.md`
  - 理由: 実地で得た知見（テスト由来ルール等）をナレッジ化し、再発を防止するため
- 本番前に導線を確認
  - 参照: `/README.md`（Docs Index）
  - 理由: ドキュメントの入口を整備し、参照性を高めるため
