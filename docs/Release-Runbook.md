# Release Runbook

## 前提
- PRテンプレ（PLAN/IMPACT/CHECK/OPEN/DOC-PATCH）完了
- 最小契約テスト（必須対象）Green
- 型&Zodプリフライト済み

## 段階リリース（Feature Flag）
1) デフォルトOFFで本番デプロイ
2) 自orgのみON → SLI監視（SLO-SLI.md）
3) 問題なければ段階拡大

## ロールバック
- まず Flag OFF（即時）
- なお復旧不可は `revert:latest` 実行
- 影響連絡：短文テンプレ

## PDF 生成トラブルシュート（Vercel）
- 症状: 文字化け/豆腐 → 対処: **Noto Sans JP** がバンドルされているか確認
- 症状: タイムアウト → 対処: ページ分割・画像圧縮・一時保存後の分割生成
- 症状: メモリ不足 → 対処: ヘッドレスレンダリング簡素化・チャンク生成
- 失敗時の共通: 再試行（指数バックオフ）＋エラーログ（requestId付き）
