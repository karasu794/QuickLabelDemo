# Square API Docs (Auto-synced)

- 仕様: `openapi.json`（自動取得）
- 型: `src/gen/square/schema.d.ts`（openapi-typescript）
- Zodクライアント: `src/gen/square/zod-client`（openapi-zod-client）
- 人間用資料: `reference.md`（Markdown） / `reference.html`（Redoc）

## 同期コマンド
```
pnpm docs:square:sync
pnpm docs:square:build
```

## メモ
- 取得時に `ETag` を保持して 304 同期を有効化
- 仕様の `info.version` は `docs/vendors/square/VERSION` に保存

