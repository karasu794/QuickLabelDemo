# Health Endpoint

`GET /api/dev/health`

## Response (200 JSON)
```json
{
  "ok": true,
  "env": "staging",
  "openai": true,
  "supabase": false,
  "ts": "2025-10-19T12:34:56.789Z",
  "guarded": true
}
```
- `env`: `APP_ENV` の値
- `openai`: `OPENAI_API_KEY` が設定されていれば true
- `supabase`: `SUPABASE_SERVICE_ROLE_KEY` が設定されていれば true
- `guarded`: このエンドポイントが Bearer ガード配下にある前提なら `true` を返す（静的 true）

## Notes
- App Router (Next.js) 前提
- Guard が未導入でも 200 を返せる（ルート単体で完結）
- Guard 導入済みの場合、無認証アクセスは 401、正しいトークンで 200
