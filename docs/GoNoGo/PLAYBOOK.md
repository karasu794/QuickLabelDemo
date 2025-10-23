# Go/No-Go Playbook

## 1) Preflight (Staging)
- `bash scripts/go_nogo/10_preflight_staging.sh`
- 期待: プレイブック合格基準を全て満たす

## 2) Prod READ ONLY
- `scripts/go_nogo/21_prod_readonly.md` に従いSQLのみ実施→集計

## 3) Canary ON & Monitor
- `bash scripts/go_nogo/30_canary_on.sh`
- `node scripts/go_nogo/40_monitor_canary.cjs`
- 閾値OKなら `node scripts/go_nogo/41_notify_discord.cjs "GO: thresholds OK"`
- NGなら `bash scripts/go_nogo/31_canary_off.sh` → "NO-GO" を通知

## 4) 全体ON → 24h 監視
- 同様の手順で継続監視、問題時は即OFF & Revert（Release-Runbook参照）
