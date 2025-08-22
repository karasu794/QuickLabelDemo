# QuickLabel - Supabase Type Generation

## Supabase 型生成（ローカル）

1. `.env.local` に `SUPABASE_PROJECT_REF` を設定してください。
2. 次でDBスキーマから型を生成して `src/types/supabase.ts` を更新します。

```bash
npm run typegen
```

※ 環境変数のexportは不要です。スクリプトが `.env.local` を自動読込します。

## CIの型ドリフト検出

GitHub Actions ジョブ「Supabase Typegen Drift Check」が、リモートのスキーマから生成した `src/types/supabase.gen.ts` と既存の `src/types/supabase.ts` を比較し、差分があれば失敗します。

ドリフトを解消するには、ローカルで `npm run typegen` を実行し、差分をコミットしてください。


