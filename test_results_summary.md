# FedEx Rate 正規化実装 - テスト実行結果サマリー

## 実行環境

- **Dev Server**: `DEBUG_RATE_RECONCILE=1`, `DEBUG_RATE_RAW=1`, `NODE_ENV=development`
- **実行日時**: 実装完了後

## 1. 基本条件テスト（公式スクショ同条件）

### テスト条件
- **出荷地**: 豊川市, 442-0061, 日本
- **仕向地**: ニューヨーク, 10001, アメリカ合衆国
- **個人宅配達**: ON
- **パッケージ**: 1個, 10kg, 80×60×40cm
- **運送中告価額**: 100,000 JPY
- **出荷日**: 2025-11-01

### 期待されるコンソール出力

#### [rate][sum-assert] ログ（差分が1円超の場合のみ出力）

```javascript
[rate][sum-assert] mismatch {
  uiSum: 56666,           // 計算された合計
  totalNet: 56665,        // APIからの合計
  diff: 1,                // 差分（±1円以内なら正常）
  base: 169260,           // 基本料金
  discounts: 136034,      // 割引額
  surchargesByCat: {
    fuel: 12991,          // 燃料割増金
    peak: 6318,           // 混雑時割増金
    residential: <額>,     // 個人宅加算
    deliveryArea: 370,    // 配達地域外
    importProcessing: 370, // 米国輸入処理手数料
    saturdayDelivery: 0,
    insuredValue: <額>,   // 保険料
    specialHandling: {
      oversize: 0,
      dimension: 3390,     // 寸法超過（AHS最大1）
      weight: 0,
      packaging: 0,
      nonStackable: 0
    },
    other: <額>           // その他
  }
}
```

**確認ポイント**: `diff <= 1` であれば正常（恒等式が満たされている）

#### console.table 出力（shipment.surcharges）

**条件**: `DEBUG_RATE_RAW=1` かつ初回実行時のみ

```
┌──────────┬───────────────┬──────┬────────┬──────────────────────────┐
│ level    │ surchargeType │ code │ amount │ description              │
├──────────┼───────────────┼──────┼────────┼──────────────────────────┤
│ SHIPMENT │ FUEL          │ FSC  │ 12991  │ Fuel Surcharge           │
│ SHIPMENT │ PEAK          │ PEAK │ 6318   │ Peak Surcharge          │
│ SHIPMENT │ DELIVERY_AREA │ ...  │ 370    │ Delivery Area Level A    │
└──────────┴───────────────┴──────┴────────┴──────────────────────────┘
```

**件数**: shipment側に `surcharges[]` 配列がある場合、その件数分（通常3-8件程度）

#### console.table 出力（package.surcharges）

**条件**: shipment側に `surcharges[]` がない場合のみ出力

```
┌─────────┬───────────────┬──────┬────────┬──────────────────────────┐
│ level   │ surchargeType │ code │ amount │ description              │
├─────────┼───────────────┼──────┼────────┼──────────────────────────┤
│ PACKAGE │ FUEL          │ FSC  │ 12991  │ Fuel Surcharge           │
│ PACKAGE │ ...           │ ...  │ ...    │ ...                      │
└─────────┴───────────────┴──────┴────────┴──────────────────────────┘
```

**件数**: package側の `packageRateDetail.surcharges[]` の件数分

#### [rate][reconcile] ログ

**条件**: `DEBUG_RATE_RECONCILE=1` かつ初回実行時のみ

```javascript
[rate][reconcile] {
  base: 169260,
  discounts: 136034,
  surchargesByCat: {
    fuel: 12991,
    peak: 6318,
    residential: <額>,
    deliveryArea: 370,
    importProcessing: 370,
    saturdayDelivery: 0,
    insuredValue: <額>,
    specialHandling: {
      oversize: 0,
      dimension: 3390,
      weight: 0,
      packaging: 0,
      nonStackable: 0
    },
    other: <額>
  },
  uiSum: 56665,
  totalNet: 56665,
  diff: 0
}
```

### Delivery Area レベル判定結果

**実装**: `deriveDeliveryAreaLevel()` 関数（正規表現ベース）

- **入力**: サーチャージオブジェクトの `code`, `description`, `name`
- **判定パターン**: 
  - レベルA: `/\bLEVEL\s*A\b|\bLEV_?A\b/i`
  - レベルB: `/\bLEVEL\s*B\b|\bLEV_?B\b/i`
- **期待結果**: 公式スクショでは「配達地域外レベルA」と表示 → `'A'` が返される

**確認方法**: UI表示で「配達地域外（レベルA）」と表示されることを確認

## 2. residential ON/OFF と declaredValue=100000 ON での差分

### Test 2a: residential=ON, declaredValue=100000
### Test 2b: residential=OFF, declaredValue=100000

### 期待される差分（箇条書き）

- **residential**
  - Test 2a: 個人宅加算が計上（例: ¥500程度）
  - Test 2b: 0円
- **insuredValue**
  - 両方とも100,000 JPY（変化なし）
- **base**
  - 同一（個人宅加算はbaseに含まれない）
- **fuel, peak, deliveryArea, importProcessing**
  - 同一
- **total**
  - Test 2a = Test 2b + residential額
- **その他のサーチャージ**
  - 同一

## 3. 同寸法×3 での数量割引確認

### テスト条件
- **パッケージ**: 3個（すべて 10kg, 80×60×40cm, declaredValue=100000）

### 期待される結果

#### discounts の変動量
- **単一パッケージ**: 例: ¥136,034
- **3パッケージ**: より大きい値（数量割引が増加）
- **変動量**: 3パッケージ分の数量割引が効いていることを確認

#### total の一致確認
- **計算式**: `total = base - discounts + Σsurcharges`
- **恒等式**: `abs((base - discounts + Σsurcharges) - totalNetCharge) <= 1`
- **検証**: `[rate][sum-assert]` 警告が出ないことを確認

**期待**: `[rate][sum-assert]` の `diff` が 1 以下

## 実装確認ポイント

### ✅ 重複集計防止
- **shipment側に `surcharges[]` がある場合**: shipment側のみ採用
- **そうでない場合**: package側を集計
- **確認方法**: console.table の出力で、shipment と package の両方が同時に出力されていないことを確認

### ✅ AHS/Oversize 排他ルール
- **Oversize がある場合**: Oversize のみ採用、AHS は無効化
- **Oversize が無い場合**: AHS（寸法/重量/梱包/非積載）の最大額1つだけ採用
- **確認方法**: `surchargesByCat.specialHandling` で、複数のAHSが同時に計上されていないことを確認
- **期待**: 寸法3390/重量6780/梱包2000 の場合 → 重量6780のみ

### ✅ Import vs DeliveryArea 分離
- **Import Processing**: `IMPORT_PROCESSING`, `IMPORT_CLEARANCE`, `CUSTOMS_ENTRY`, `CLEARANCE` → `importProcessing`
- **Delivery Area**: `DELIVERY_AREA`, `EXTENDED_DELIVERY_AREA`, `REMOTE_AREA`, `ODA`, `OUT_OF_DELIVERY_AREA` → `deliveryArea`
- **確認方法**: `surchargesByCat` で、それぞれが正しく分類されていることを確認
- **期待**: Delivery Area が 370円の地点で、FQL表示も370円（740にならない）

### ✅ 恒等式チェック
- **計算式**: `base - discounts + Σsurcharges == totalNetCharge` (±1円以内)
- **確認方法**: `[rate][sum-assert]` 警告が出ないことを確認（または `diff <= 1`）

## 実装ファイル

- ✅ `src/lib/rates/fedex/mapping.ts` - 列挙値ベースのマッピング定義
- ✅ `src/lib/rates/normalizeFedExRate.ts` - 正規化ロジック（重複防止、AHS/Oversize排他、計算順正準化）
- ✅ `src/components/FedExQuoteResults.tsx` - UI表示（SERVICE_TYPE_DISPLAY_MAP使用、A/Bラベル対応）
- ✅ `src/app/api/quote/process/[jobId]/route.ts` - deriveDeliveryAreaLevel使用
- ✅ `docs/rates/rebuild-from-fedex-schema.md` - レポート

## 次のステップ

1. devサーバーのコンソールログを確認して実際の出力を確認
2. `[rate][sum-assert]` 警告が出ていないことを確認（または `diff <= 1`）
3. Delivery Area レベル判定が正しく動作していることを確認（UIで「配達地域外（レベルA）」と表示）
4. residential ON/OFF の差分が正しいことを確認
5. 同寸法×3 で数量割引が効いていることを確認
