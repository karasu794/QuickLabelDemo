# Actions Examples

## Health (curl)
```bash
curl -sS -H "Authorization: Bearer $ACTIONS_TOKEN" \
  "$BASE_URL/api/dev/health"
```

## Runtime Logs (curl)
```bash
curl -sS -H "Authorization: Bearer $ACTIONS_TOKEN" \
  "$BASE_URL/api/diagnostics/runtime-logs?since=2025-01-01T00:00:00Z&limit=1&status=ERROR"
```

## Run E2E and poll (curl)
```bash
JOB=$(curl -sS -H "Authorization: Bearer $ACTIONS_TOKEN" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"suite":"smoke"}' "$BASE_URL/api/run-e2e" | jq -r .jobId)
echo "JOB=$JOB"
# 以後 /api/runs/$JOB を監視するなど
```

## @browser GET Health
```http
GET {{BASE_URL}}/api/dev/health
Authorization: Bearer {{ACTIONS_TOKEN}}
```

## @browser GET Runtime Logs
```http
GET {{BASE_URL}}/api/diagnostics/runtime-logs?since=2025-01-01T00:00:00Z&limit=1&status=ERROR
Authorization: Bearer {{ACTIONS_TOKEN}}
```
