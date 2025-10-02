# Release Runbook

## 0. 前提
- 変更は常に小バッチ（files<=3, new-exports<=2, public-sig=0）
- Feature Flag デフォルトOFFで出荷（自org→100%）

## 1. リリース
1) Flag OFFのままデプロイ
2) 自orgだけ ON → SLI/ログ確認 → 段階展開

## 2. インシデント時
1) 影響範囲確認 → **Flag OFF**
2) One-Click Revert（例: `pnpm revert:latest`）
3) 告知テンプレ（1行）→ チャンネル/顧客
4) Postmortemライト（WHAT/WHY/RULE）をPRに追記

## 3. PDF生成のトラブルシュート（Vercel）
- フォント: Noto Sans JP
- タイムアウト/メモリ: Vercel 制約に注意
- 典型エラーと対応を箇条書きで後日追記
