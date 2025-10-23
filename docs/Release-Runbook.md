# Release Runbook

## 前提
- PRテンプレ（PLAN/IMPACT/CHECK/OPEN/DOC-PATCH）完了
- 最小契約テスト（必須対象）Green
- 型&Zodプリフライト済み

## 段階リリース（Feature Flag）
1) デフォルトOFFで本番デプロイ
2) 自orgのみON → SLI監視（SLO-SLI.md）
3) 問題なければ段階拡大

### Hotfix Pack: Go/No-Go 切替手順
- フラグ: `FQL_HOTFIX_SUCCESS_PAGE`
- Staging → カナリア → 全体ON の順で適用
- 手順:
  1. `bash scripts/go_nogo/10_preflight_staging.sh` をStagingで実行し、`docs/GoNoGo/REPORT_staging.md` を確認
  2. カナリアON: `bash scripts/go_nogo/30_canary_on.sh`
  3. 監視: `node scripts/go_nogo/40_monitor_canary.cjs`（実メトリクス取得処理に差し替え可）
  4. 閾値OK → `node scripts/go_nogo/41_notify_discord.cjs "GO: thresholds OK"`（全体ONへ）
  5. 閾値NG → `bash scripts/go_nogo/31_canary_off.sh`（即オフ）→ Stagingで再現＆修正

## ロールバック
- まず Flag OFF（即時）
- なお復旧不可は `revert:latest` 実行
- 影響連絡：短文テンプレ

## PDF 生成トラブルシュート（Vercel）
- 症状: 文字化け/豆腐 → 対処: **Noto Sans JP** がバンドルされているか確認
- 症状: タイムアウト → 対処: ページ分割・画像圧縮・一時保存後の分割生成
- 症状: メモリ不足 → 対処: ヘッドレスレンダリング簡素化・チャンク生成
- 失敗時の共通: 再試行（指数バックオフ）＋エラーログ（requestId付き）
