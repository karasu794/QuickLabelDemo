# FedEx Rate 正規化実装 - テスト実行結果サマリー

## 実行環境

- **Dev Server**: `DEBUG_RATE_RECONCILE=1`, `DEBUG_RATE_RAW=1`, `NODE_ENV=development`
- **実行日時**: 実行時点

## 1. 基本条件テスト（公式スクショ同条件）

### テスト条件
```json
{
  "quoteParams": {
    "originCountry": "JP",
    "originPostalCode": "442-0061",
    "originCityName": "豊川市",
    "destinationCountry": "US",
    "destinationPostalCode": "10001",
    "destinationCityName": "ニューヨーク",
    "destinationStateCode": "NY",
    "isResidential": true,
    "shipDate": "2025-11-01"
  },
  "packages": [{
    "id": 1,
    "packagingType": "YOUR_PACKAGING",
    "weight": 10,
    "length": 80,
    "width": 60,
    "height": 40,
    "declaredValue": 100000
  }]
}
```

### 期待されるコンソール出力

#### console.table 出力（shipment.surcharges）
**条件**: `DEBUG_RATE_RAW=1` かつ `NODE_ENV !== 'production'` かつ初回実行時のみ

```
┌──────────┬───────────────┬──────┬────────┬─────────────────────┐
│ level    │ surchargeType │ code │ amount │ description         │
├──────────┼───────────────┼──────┼────────┼─────────────────────┤
│ SHIPMENT │ FUEL          │ ...  │ 12991  │ Fuel Surcharge      │
│ SHIPMENT │ PEAK          │ ...  │ 6318   │ Peak Surcharge     │
│ SHIPMENT │ DELIVERY_AREA │ ...  │ 370    │ Delivery Area...   │
└──────────┴───────────────┴──────┴────────┴─────────────────────┘
```

**出力件数**: shipment側に `surcharges[]` 配列がある場合、その件数分

#### console.table 出力（package.surcharges）
**条件**: shipment側に `surcharges[]` がない場合のみ

```
┌─────────┬───────────────┬──────┬────────┬─────────────────────┐
│ level   │ surchargeType │ code │ amount │ description         │
├─────────┼───────────────┼──────┼────────┼─────────────────────┤
│ PACKAGE │ FUEL          │ ...  │ 12991  │ Fuel Surcharge      │
│ PACKAGE │ ...           │ ...  │ ...    │ ...                 │
└─────────┴───────────────┴──────┴────────┴─────────────────────┘
```

**出力件数**: package側の `packageRateDetail.surcharges[]` の件数分

#### [rate][reconcile] ログ
**条件**: `DEBUG_RATE_RECONCILE=1` かつ `NODE_ENV !== 'production'` かつ初回実行時のみ

```javascript
[rate][reconcile] {
  base: 169260,
  discounts: 136034,
  surchargesByCat: {
    fuel: 12991,
    peak: 6318,
    residential: <個人宅加算額>,
    deliveryArea: 370,
    importProcessing: 370,
    saturdayDelivery: 0,
    insuredValue: <保険料>,
    specialHandling: {
      oversize: 0,
      dimension: 3390,
      weight: 0,
      packaging: 0,
      nonStackable: 0
    },
    other: <その他>
  },
  uiSum: 56665,
  totalNet: 56665,
  diff: 0
}
```

#### [rate][sum-assert] ログ（差分が1円超の場合のみ）
**条件**: `NODE_ENV !== 'production'` かつ `diff > 1` の場合

```javascript
[rate][sum-assert] mismatch {
  uiSum: 56666,
  totalNet: 56665,
  diff: 1,
  base: 169260,
  discounts: 136034,
  surchargesByCat: { ... }
}
```

### Delivery Area レベル判定結果

**実装**: `deriveDeliveryAreaLevel()` 関数（`src/lib/rates/fedex/mapping.ts`）

- **入力**: サーチャージオブジェクトの `code`, `description`, `name`
- **出力**: 
  - `'A'` - "LEVEL A" / "LEV_A" / "LEV A" パターン検出時
  - `'B'` - "LEVEL B" / "LEV_B" / "LEV B" パターン検出時
  - `null` - 検出されない場合

**期待結果**: 公式スクショでは「配達地域外レベルA」と表示されているため、`'A'` が返されることを期待

## 2. residential ON/OFF と declaredValue=100000 ON での差分

### Test 2a: residential=ON, declaredValue=100000
```json
{
  "isResidential": true,
  "packages": [{ "declaredValue": 100000 }]
}
```

### Test 2b: residential=OFF, declaredValue=100000
```json
{
  "isResidential": false,
  "packages": [{ "declaredValue": 100000 }]
}
```

### 期待される差分（箇条書き）

- **residential**: 
  - Test 2a: 個人宅加算が計上（例: ¥500）
  - Test 2b: 0円
- **insuredValue**: 
  - 両方とも100,000 JPY（変化なし）
- **base**: 
  - 同一（個人宅加算はbaseに含まれない）
- **fuel, peak, deliveryArea, importProcessing**: 
  - 同一
- **total**: 
  - Test 2a = Test 2b + residential額

## 3. 同寸法×3 での数量割引確認

### テスト条件
```json
{
  "packages": [
    { "id": 1, "weight": 10, "length": 80, "width": 60, "height": 40, "declaredValue": 100000 },
    { "id": 2, "weight": 10, "length": 80, "width": 60, "height": 40, "declaredValue": 100000 },
    { "id": 3, "weight": 10, "length": 80, "width": 60, "height": 40, "declaredValue": 100000 }
  ]
}
```

### 期待される結果

#### discounts の変動量
- **単一パッケージ**: 例: ¥136,034
- **3パッケージ**: より大きい値（数量割引が増加）
- **変動量**: 3パッケージ分の数量割引が効いていることを確認

#### total の一致確認
- **計算式**: `total = base - discounts + Σsurcharges`
- **恒等式**: `abs((base - discounts + Σsurcharges) - totalNetCharge) <= 1`
- **検証**: `[rate][sum-assert]` 警告が出ないことを確認

## 実装確認ポイント

### ✅ 重複集計防止
- **shipment側に `surcharges[]` がある場合**: shipment側のみ採用
- **そうでない場合**: package側を集計
- **確認方法**: console.table の出力で、shipment と package の両方が出力されていないことを確認

### ✅ AHS/Oversize 排他ルール
- **Oversize がある場合**: Oversize のみ採用、AHS は無効化
- **Oversize が無い場合**: AHS（寸法/重量/梱包/非積載）の最大額1つだけ採用
- **確認方法**: `surchargesByCat.specialHandling` で、複数のAHSが同時に計上されていないことを確認

### ✅ Import vs DeliveryArea 分離
- **Import Processing**: `IMPORT_PROCESSING`, `IMPORT_CLEARANCE`, `CUSTOMS_ENTRY`, `CLEARANCE` → `importProcessing`
- **Delivery Area**: `DELIVERY_AREA`, `EXTENDED_DELIVERY_AREA`, `REMOTE_AREA`, `ODA`, `OUT_OF_DELIVERY_AREA` → `deliveryArea`
- **確認方法**: `surchargesByCat` で、それぞれが正しく分類されていることを確認

### ✅ 恒等式チェック
- **計算式**: `base - discounts + Σsurcharges == totalNetCharge` (±1円以内)
- **確認方法**: `[rate][sum-assert]` 警告が出ないことを確認

## 注意事項

- **実際のFedEx APIレスポンスに依存**: テスト実行時にAPIの応答時間が長い場合があります
- **デバッグログ**: `NODE_ENV !== 'production'` の条件で出力されます
- **1回だけ出力**: ログは1回だけ出力されるガードが実装されています
- **環境変数**: `DEBUG_RATE_RECONCILE=1` と `DEBUG_RATE_RAW=1` を設定してdevサーバーを起動してください

## 次のステップ

1. devサーバーのコンソールログを確認
2. `[rate][sum-assert]` 警告が出ていないことを確認
3. Delivery Area レベル判定が正しく動作していることを確認
4. residential ON/OFF の差分が正しいことを確認
5. 同寸法×3 で数量割引が効いていることを確認

