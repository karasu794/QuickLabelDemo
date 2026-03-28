# FedEx Rate 自動観測・学習パイプライン

FedEx APIをUI経由ではなく**直接叩いて**、レートレスポンスを継続観測 → 正規化 → 差分検出 → マッピング更新 → 再試算するAI駆動パイプライン。

## ディレクトリ構造

```
scripts/fedex/
  ├── request_rates.ts    # FedEx Rate API呼び出し
  ├── normalize_rates.ts  # レスポンス正規化
  ├── reconcile.ts        # 差分検出・マッピング更新
  └── run_cycle.sh        # 連続実行スクリプト

artifacts/fedex_logs/
  └── YYYYMMDD/
      ├── run_TIMESTAMP.json           # 生レスポンス
      └── normalized_CASEID_DATE.json  # 正規化済み

fedex_cases/
  ├── C1.json  # テストケース1
  ├── C2.json  # テストケース2
  └── C3.json  # テストケース3
```

## 使用方法

### 1. 単一ケースのリクエスト実行

```bash
# ケースID指定
pnpm fedex:request --case-id C1

# またはファイルパス指定
pnpm fedex:request fedex_cases/C1.json
```

### 2. レスポンスの正規化

```bash
# 最新のログファイルを正規化
pnpm fedex:norm --latest

# または特定ファイルを指定
pnpm fedex:norm artifacts/fedex_logs/20251102/run_2025-11-02T12-00-00.json
```

### 3. 差分検出・マッピング更新提案

```bash
# 差分を確認（提案のみ）
pnpm fedex:reconcile

# mapping.tsに自動追加
pnpm fedex:reconcile --apply
```

### 4. 自動ループ実行

```bash
# デフォルトケース（C1, C2, C3）を実行
bash scripts/fedex/run_cycle.sh

# または特定ケースを指定
bash scripts/fedex/run_cycle.sh --cases C1 C2
```

## テストケースの追加

`fedex_cases/` ディレクトリに新しいJSONファイルを追加：

```json
{
  "caseId": "C4",
  "description": "ケース説明",
  "shipper": {
    "countryCode": "JP",
    "postalCode": "100-0001",
    "cityName": "Tokyo"
  },
  "recipient": {
    "countryCode": "US",
    "postalCode": "10001",
    "stateCode": "NY",
    "cityName": "New York",
    "isResidential": true
  },
  "shipDate": "2025-11-15",
  "packages": [
    {
      "weight": 2.5,
      "dimensions": {
        "length": 30,
        "width": 20,
        "height": 15
      },
      "declaredValue": 50000
    }
  ]
}
```

## ログ形式

### 生レスポンス (`run_TIMESTAMP.json`)

```json
{
  "caseId": "C1",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "request": { ... },
  "fedexRaw": {
    "rateReplyDetails": [ ... ]
  }
}
```

### 正規化済み (`normalized_CASEID_DATE.json`)

```json
{
  "caseId": "C1",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "sourceFile": "run_2025-11-02T12-00-00.json",
  "normalized": {
    "FEDEX_INTERNATIONAL_PRIORITY": {
      "baseCharge": { "amount": 10000, "currency": "JPY" },
      "surcharges": { ... },
      "totalNetCharge": { "amount": 12000, "currency": "JPY" }
    }
  }
}
```

## 環境変数

以下の環境変数が必要です：

- `FEDEX_EXPORT_API_KEY` / `FEDEX_EXPORT_SECRET_KEY` / `FEDEX_EXPORT_ACCOUNT_NUMBER`
- `FEDEX_IMPORT_API_KEY` / `FEDEX_IMPORT_SECRET_KEY` / `FEDEX_IMPORT_ACCOUNT_NUMBER`

## 今後の拡張

- [ ] Cron対応（定期実行）
- [ ] Slack通知（差分検出時）
- [ ] レスポンスキャッシュ（短期）
- [ ] API limit safety（レート制限対策）
- [ ] 複数ケースの並列実行

