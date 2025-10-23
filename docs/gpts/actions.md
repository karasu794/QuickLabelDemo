# My GPTs Actions — API Integration Guide

## 利用可能な API
- `GET /api/dev/health`
- `GET /api/diagnostics/runtime-logs`
- `POST /api/run-e2e`

## 認証
Authorization ヘッダに Bearer トークンを付与します。
```
Authorization: Bearer ${ACTIONS_TOKEN}
```
- 付与しない場合は 401
- `runtime-logs` の `limit` が不正な場合は 422

## 例: /api/dev/health
- リクエスト
```
GET /api/dev/health
Authorization: Bearer ${ACTIONS_TOKEN}
```
- 成功レスポンス（200）
```json
{ "ok": true, "env": "staging", "ts": "2025-01-01T00:00:00.000Z" }
```

## 例: /api/diagnostics/runtime-logs
- リクエスト
```
GET /api/diagnostics/runtime-logs?since=2025-01-01T00:00:00Z&limit=1&status=ERROR
Authorization: Bearer ${ACTIONS_TOKEN}
```
- 成功（200）
```json
{ "items": [{ "jobId":"dummy-job","step":"init","status":"OK","cause":null,"created_at":"..." }], "nextCursor": null }
```
- バリデーションエラー（422）
```json
{ "error": "validation_error", "issues": [ { "message": "..." } ] }
```

## 例: /api/run-e2e
- リクエスト
```json
POST /api/run-e2e
Authorization: Bearer ${ACTIONS_TOKEN}
{ "suite": "smoke" }
```
- 成功（200）
```json
{ "jobId": "job_1735689600000" }
```
- 422 例
```json
{ "error": "validation_error", "issues": [ { "message": "..." } ] }
```
