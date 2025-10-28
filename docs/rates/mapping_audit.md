# Rate Breakdown Mapping Audit

本ファイルは実行時ログ [rates][audit] の出力に基づき、FedEx surchargeType と UI 表示（code/label）対応を監査するためのメモです。

- ログの出力方法:
  - DEBUG_RATE_RAW=1 を有効化し、/api/quote を一度実行
  - コンソールに [rates][audit] と [normalizeFedExRate][raw] が1回だけ出力されます

## 現在のマッピング（実装内ハードコード）

| FedEx Type | code | labelJa | group |
| --- | --- | --- | --- |
| FUEL | fuelSurcharge | 燃料割増金 | surcharge |
| PEAK | peakSurcharge | 混雑時割増金 | surcharge |
| PEAK_SEASON | peakSurcharge | 混雑時割増金 | surcharge |
| RESIDENTIAL_DELIVERY | residentialSurcharge | 個人宅加算 | surcharge |
| RESIDENTIAL | residentialSurcharge | 個人宅加算 | surcharge |
| DELIVERY_AREA | outOfDeliveryArea | 配達地域外 | surcharge |
| EXTENDED_DELIVERY_AREA | outOfDeliveryArea | 配達地域外 | surcharge |
| REMOTE_AREA | outOfDeliveryArea | 配達地域外 | surcharge |
| ADDITIONAL_HANDLING | additionalHandlingSurcharge | 特別取扱い | surcharge |
| SPECIAL_HANDLING | additionalHandlingSurcharge | 特別取扱い | surcharge |
| IMPORT_CLEARANCE | usImportProcessingFee | 米国輸入処理手数料 | surcharge |
| ANCILLARY_SERVICE_FEE | otherSurcharge | その他特別手数料 | surcharge |
| DECLARED_VALUE | declaredValue | 保険料（申告価格） | declared |
| DISCOUNT | discount | 割引 | discount |

## 観測結果メモ

- mapKeys: 実装で定義されている FedEx Type キー一覧
- observedTypes: DEBUG_RATE_RAW=1 で直近の見積取得時に観測された surchargeType 一覧
- missingInMap: 観測されたのに未マッピングのタイプ（要追加）
- extraInMap: マップにあってドキュメント列挙に無いタイプ（要確認）

> 補足: ドキュメント列挙の自動抽出はスキップ。必要に応じて手動で照合してください。
