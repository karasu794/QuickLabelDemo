# LogDoctor (My GPTs) — Structured Output Spec

## 目的
- ログ診断・再テスト計画・要因特定の支援を行うための出力を統一します。
- My GPTs Actions と連携することを前提とします。出力は JSON のみ。

## 出力スキーマ（JSON Schema 風）
```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string", "minLength": 1 },
    "rootCauses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": { "type": "string", "minLength": 1 },
          "category": { "type": "string" },
          "description": { "type": "string", "minLength": 1 }
        },
        "required": ["code", "category", "description"],
        "additionalProperties": false
      },
      "default": []
    },
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "enum": ["log", "api", "test", "metric"] },
          "source": { "type": "string", "minLength": 1 },
          "snippet": { "type": "string", "minLength": 1 }
        },
        "required": ["type", "source", "snippet"],
        "additionalProperties": false
      },
      "default": []
    },
    "fixDiffs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "pattern": "^(src|app|tests|docs)/" },
          "code": { "type": "string", "minLength": 1 }
        },
        "required": ["path", "code"],
        "additionalProperties": false
      },
      "default": []
    },
    "retest": {
      "type": "object",
      "properties": {
        "steps": { "type": "array", "items": { "type": "string", "minLength": 1 }, "minItems": 1 },
        "triggers": { "type": "array", "items": { "type": "string", "minLength": 1 } }
      },
      "required": ["steps"],
      "additionalProperties": false
    },
    "questions": { "type": "array", "items": { "type": "string", "minLength": 1 } }
  },
  "required": ["summary", "retest"],
  "additionalProperties": false
}
```

## 出力例（JSON）
```json
{
  "summary": "FedEx Rate API timeout suspected.",
  "rootCauses": [
    { "code": "FEDX_RATE_TIMEOUT", "category": "ExternalAPI", "description": "Rate API timed out" }
  ],
  "evidence": [
    { "type": "log", "source": "api/quote", "snippet": "timeout after 10s" }
  ],
  "fixDiffs": [
    { "path": "src/lib/http.ts", "code": "// add retry policy" }
  ],
  "retest": { "steps": ["run schema tests", "call /api/quote"], "triggers": ["deploy"] },
  "questions": ["Which SKUs time out?"]
}
```
