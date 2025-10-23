# 本番 READ ONLY 実行手順
1) Supabase SQL Editorで `scripts/go_nogo/20_prod_readonly.sql` を実行
2) 結果を CSV でダウンロード → `artifacts/go_nogo/prod_readonly_{orphan|duplicates}.csv` に保存
3) `node scripts/go_nogo/report_aggregate.cjs prod` を実行してレポートに反映
