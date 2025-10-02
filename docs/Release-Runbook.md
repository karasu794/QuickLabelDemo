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

## PDFトラブルシュート（Vercel）
- フォント/Noto Sans JP, メモリ/タイムアウト点検
- 再試行/遅延実行の回避策メモ
