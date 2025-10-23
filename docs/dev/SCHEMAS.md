# Schemas (Zod)

本プロジェクトで利用する構造化出力のZodスキーマ群と使用ガイドです。

## パス: `src/schemas/*`
- `specwriter.schema.ts`
- `logdoctor.schema.ts`
- `hts.schema.ts`
- `debug-report.schema.ts`
- `index.ts`（集約）

## 共通バリデータ: `src/lib/validate.ts`
- `validateOrThrow(schema, data): T` 失敗時に Error(JSON.stringify(issues)) を投げる
- `isValid(schema, data): boolean` 成否のみ

## 型集約: `src/types/schemas.d.ts`
- 各Schemaの `z.infer<>` を再エクスポート

---
## テスト保護
- Contract: `tests/contracts/schema.contract.test.ts`（SpecWriter/LogDoctor の正常/異常）
- E2E: `tests/e2e/schema.assertion.spec.ts` に簡易スキーマアサーション
- npm scripts
  - `npm run test:schema` でスキーマ系のみ実行
  - 既存 `test:contracts` にも schema.contract が含まれる

## SpecWriter
入力/出力:
```ts
{
  files: { path: string, content: string }[],
  diffs: { path: string, code: string }[],
  tests: { type: 'contract'|'e2e'|'unit', path: string, content: string }[],
  manualQA: { description: string }[]
}
```
- path は `^(src|app|tests|docs)/` にマッチ
- tests.path は `^tests/`

## LogDoctor
```ts
{
  summary: string,
  rootCauses: { code: string, category: 'ExternalAPI'|'Database'|'App'|'Config'|string, description: string }[],
  evidence: { type: 'log'|'api'|'test'|'metric', source: string, snippet: string }[],
  fixDiffs: { path: string, code: string }[],
  retest: { steps: string[], triggers?: string[] },
  questions?: string[]
}
```

## HTS Suggest
- 入力: `{ descriptionJa?, descriptionEn?, weightKg: number, originCountry: string }`
- 出力配列: `{ code: string, label: string, confidence: number, notes?: string[], evidenceUrls: string[] }[]`

## Debug Report
```ts
{
  id: string,
  jobId: string,
  summary: string,
  status: 'error'|'fixed'|'running',
  fixDiffs: string[],
  retestUrl?: string,
  createdAt: string
}
```

### Runtime Logs API – Validation Notes (Stage2-Temp)
- limit: number (1..100) / 不正時 422
- 仕様は暫定。**Stage5完了後に確定版へ更新（TODO: Yasuaki）**