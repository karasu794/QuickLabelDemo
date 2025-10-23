# SpecWriter (My GPTs) — Structured Output Spec

## 目的
- 仕様指示テンプレートを生成し、Cursor 実装指示への橋渡しを行うための出力を統一します。
- 出力は常に JSON（Structured Outputs）で返します。Markdown やテキストは不可。

## 出力スキーマ（JSON Schema 風）
```json
{
  "type": "object",
  "properties": {
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "pattern": "^(src|app|tests|docs)/" },
          "content": { "type": "string" }
        },
        "required": ["path", "content"],
        "additionalProperties": false
      },
      "default": []
    },
    "diffs": {
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
    "tests": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "enum": ["contract", "e2e", "unit"] },
          "path": { "type": "string", "pattern": "^tests/" },
          "content": { "type": "string", "minLength": 1 }
        },
        "required": ["type", "path", "content"],
        "additionalProperties": false
      },
      "default": []
    },
    "manualQA": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string", "minLength": 1 }
        },
        "required": ["description"],
        "additionalProperties": false
      },
      "default": []
    }
  },
  "required": ["files", "diffs", "tests", "manualQA"],
  "additionalProperties": false
}
```

## 出力例（必ず JSON で返すこと）
```json
{
  "files": [
    { "path": "src/lib/foo.ts", "content": "export const foo=1;" }
  ],
  "diffs": [
    { "path": "src/app/page.tsx", "code": "// apply minimal changes" }
  ],
  "tests": [
    { "type": "unit", "path": "tests/unit/foo.test.ts", "content": "test('ok',()=>{})" }
  ],
  "manualQA": [
    { "description": "Open the page and verify the label is visible" }
  ]
}
```

> 検証: `scripts/validate-gpt-json.ts` で Zod によりスキーマ適合をチェックできます。
