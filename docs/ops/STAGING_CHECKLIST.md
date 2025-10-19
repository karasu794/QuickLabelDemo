# Staging 運用チェックリスト

- [ ] `.env.local.stg` を `.env.local` に適用
- [ ] Vercel(Preview/Development) に `OPENAI_API_KEY`, `ACTIONS_TOKEN`, `APP_ENV=staging` を設定
- [ ] `curl -s https://<host>/api/dev/health` が 200（または Guard 下で 401→Bearer指定で200）
- [ ] `npm run ping:openai` が `ok:true` を返す
- [ ] Supabase 接続（Service Role）で 200 応答
- [ ] ログに機密値が出ていない
