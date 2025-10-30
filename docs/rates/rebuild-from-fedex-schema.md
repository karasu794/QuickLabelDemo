# FedEx Rate API スキーマ準拠によるレート正規化の再構築

## 目的

FedEx Rate APIの公式ドキュメント/OpenAPI定義/サンプルを一次ソースとして参照し、正規表現に依存しない"列挙値ベース"の厳密マッピングを再構築。公式UIと一致する内訳（base/discount/surcharges）と合計の厳密整合を実現。

## 出典ファイル

以下のファイルから列挙値・型情報を抽出：

1. **レスポンスサンプル**
   - `docs/fedex_api_specs/samples/docs-examples/rate-v1-docs-res-00.json`
   - FedEx Rate APIの実際のレスポンス構造と列挙値を確認

2. **APIドキュメント**
   - `docs/fedex_api_specs/md/rate-v1-docs.md`
   - Rate APIの仕様説明と列挙値の定義

3. **既存実装の参照**
   - `src/lib/rates/fedex/feeDetailKeys.ts`
   - `src/lib/rates/fedex/surchargeMaps.ts`
   - 既存のマッピングロジックを参考に列挙値ベースへ移行

## 抽出した列挙値・型情報

### serviceType（サービス種別）

レスポンスサンプルから確認された主要な値：

- `INTERNATIONAL_PRIORITY`
- `INTERNATIONAL_PRIORITY_EXPRESS`
- `INTERNATIONAL_ECONOMY`
- `INTERNATIONAL_FIRST`（除外対象）
- `FEDEX_INTERNATIONAL_PRIORITY`
- `FEDEX_INTERNATIONAL_ECONOMY`
- `FEDEX_GROUND`
- `PRIORITY_OVERNIGHT`
- `STANDARD_OVERNIGHT`
- `FIRST_OVERNIGHT`
- `FEDEX_2_DAY`
- `FEDEX_EXPRESS_SAVER`

### rateType / rateRequestType

- `ACCOUNT` - アカウント固有の料金
- `LIST` - リスト料金
- `PREFERRED_INCENTIVE` - 優先通貨インセンティブ料金
- `PREFERRED_CURRENCY` - 優先通貨料金

### surchargeType / code（サーチャージ分類）

レスポンスサンプルとドキュメントから抽出した列挙値：

#### Fuel（燃料割増金）
- `FUEL`
- `FUEL_SURCHARGE`
- `FSC`

#### Peak（混雑時割増金）
- `PEAK`
- `PEAK_SEASON`
- `DEMAND`
- `SURGE`
- `CONGESTION`

#### Residential（個人宅加算）
- `RESIDENTIAL`
- `RESIDENTIAL_DELIVERY`
- `RESIDENTIAL_SURCHARGE`

#### Delivery Area（配達地域外）
- `DELIVERY_AREA`
- `EXTENDED_DELIVERY_AREA`
- `REMOTE_AREA`
- `ODA`
- `OUT_OF_DELIVERY_AREA`

**レベルA/Bの判定**: `description` / `code` / `name` から "LEVEL A" / "LEVEL B" / "LEV_A" / "LEV_B" などを検出

#### Import Processing（米国輸入処理手数料）
- `IMPORT_PROCESSING`
- `IMPORT_CLEARANCE`
- `CUSTOMS_ENTRY`
- `CLEARANCE`
- `CUSTOMS_CLEARANCE`

**注意**: Delivery Area と Import Processing は厳密に分離（誤分類を防止）

#### Saturday Delivery（土曜配達）
- `SATURDAY_DELIVERY`
- `WEEKEND_DELIVERY`
- `SATURDAY_PICKUP`

#### Insured Value（保険料）
- `DECLARED_VALUE`
- `INSURED_VALUE`
- `DECLARED`
- `INSURED`

#### Oversize（長尺）
- `OVERSIZE`
- `DIMENSIONAL_OVERSIZE`
- `OVERSIZE_PACKAGE`

**排他ルール**: Oversize があれば AHS を無効化

#### Additional Handling - Dimension（寸法超過）
- `ADDITIONAL_HANDLING_DIMENSION`
- `AHS_DIMENSION`
- `ADDITIONAL_HANDLING_SIZE`

#### Additional Handling - Weight（重量超過）
- `ADDITIONAL_HANDLING_WEIGHT`
- `AHS_WEIGHT`

#### Additional Handling - Packaging（梱包）
- `ADDITIONAL_HANDLING_PACKAGING`
- `AHS_PACKAGING`
- `ADDITIONAL_HANDLING_TUBE`
- `ADDITIONAL_HANDLING_CYLINDER`

#### Additional Handling - Non-Stackable（非積載）
- `NON_STACKABLE`
- `AHS_NONSTACKABLE`

### 金額フィールド構造

レスポンスサンプルから確認された構造：

#### Shipment レベル
- `shipmentRateDetail.totalBaseCharge` - 基本料金（割引前）
- `shipmentRateDetail.totalDiscounts` - 割引額
- `shipmentRateDetail.totalSurcharges` - サーチャージ合計
- `shipmentRateDetail.surcharges[]` - サーチャージ明細配列
- `ratedShipmentDetails[].totalNetCharge` - 合計料金

#### Package レベル
- `packageRateDetail.baseCharge` - パッケージ基本料金
- `packageRateDetail.netFreight` - 正味運賃（base - discounts）
- `packageRateDetail.totalSurcharges` - パッケージサーチャージ合計
- `packageRateDetail.surcharges[]` - パッケージサーチャージ明細配列

## 最終マッピング表

### surchargeType → カテゴリマッピング

| surchargeType列挙値 | カテゴリ | 備考 |
|---|---|---|
| FUEL, FUEL_SURCHARGE, FSC | FUEL | 燃料割増金 |
| PEAK, PEAK_SEASON, DEMAND, SURGE, CONGESTION | PEAK | 混雑時割増金 |
| RESIDENTIAL, RESIDENTIAL_DELIVERY | RESIDENTIAL | 個人宅加算 |
| DELIVERY_AREA, EXTENDED_DELIVERY_AREA, REMOTE_AREA, ODA, OUT_OF_DELIVERY_AREA | DELIVERY_AREA | 配達地域外（レベルA/Bは別途判定） |
| IMPORT_PROCESSING, IMPORT_CLEARANCE, CUSTOMS_ENTRY, CLEARANCE, CUSTOMS_CLEARANCE | IMPORT_PROCESSING | 米国輸入処理手数料 |
| SATURDAY_DELIVERY, WEEKEND_DELIVERY, SATURDAY_PICKUP | SATURDAY_DELIVERY | 土曜配達 |
| DECLARED_VALUE, INSURED_VALUE, DECLARED, INSURED | INSURED_VALUE | 保険料（申告価格） |
| OVERSIZE, DIMENSIONAL_OVERSIZE, OVERSIZE_PACKAGE | OVERSIZE | 長尺（AHSと排他） |
| ADDITIONAL_HANDLING_DIMENSION, AHS_DIMENSION, ADDITIONAL_HANDLING_SIZE | AHS_DIMENSION | 寸法超過 |
| ADDITIONAL_HANDLING_WEIGHT, AHS_WEIGHT | AHS_WEIGHT | 重量超過 |
| ADDITIONAL_HANDLING_PACKAGING, AHS_PACKAGING, ADDITIONAL_HANDLING_TUBE, ADDITIONAL_HANDLING_CYLINDER | AHS_PACKAGING | 梱包 |
| NON_STACKABLE, AHS_NONSTACKABLE | AHS_NONSTACKABLE | 非積載 |

### serviceType → 表示名マッピング

| serviceType | 表示名 |
|---|---|
| INTERNATIONAL_PRIORITY | FedEx International Priority® |
| INTERNATIONAL_PRIORITY_EXPRESS | FedEx International Priority® Express |
| INTERNATIONAL_ECONOMY | FedEx International Economy® |
| FEDEX_INTERNATIONAL_PRIORITY | FedEx International Priority® |
| FEDEX_INTERNATIONAL_ECONOMY | FedEx International Economy® |
| PRIORITY_OVERNIGHT | FedEx Priority Overnight® |
| STANDARD_OVERNIGHT | FedEx Standard Overnight® |
| FIRST_OVERNIGHT | FedEx First Overnight® |
| FEDEX_2_DAY | FedEx 2Day® |
| FEDEX_EXPRESS_SAVER | FedEx Express Saver® |
| FEDEX_GROUND | FedEx Ground® |

## 計算順の定義・根拠

### FedEx API仕様に準拠した計算順序

レスポンスサンプル（`rate-v1-docs-res-00.json`）から確認された公式の計算順序：

1. **totalBaseCharge** = ベース料金（割引前）
   - `shipmentRateDetail.totalBaseCharge` を優先
   - フォールバック: `packageRateDetail.baseCharge` の合計
   - 最終フォールバック: `totalNetCharge - totalSurcharges + totalDiscounts`

2. **totalDiscounts** = 割引額
   - `shipmentRateDetail.totalDiscounts` または `ratedShipmentDetails[].totalDiscounts`
   - 負の値として扱い、表示は "数量割引 -¥..." 形式

3. **netFreight** = 正味運賃
   - `netFreight = totalBaseCharge - totalDiscounts`
   - `packageRateDetail.netFreight` も存在するが、shipment レベルの計算を優先

4. **totalSurcharges** = サーチャージ合計
   - `shipmentRateDetail.totalSurcharges` または個別サーチャージの合計
   - 重複集計防止: shipment側に明示内訳（`surcharges[]`）がある場合は shipment側のみ採用

5. **totalNetCharge** = 合計料金
   - `totalNetCharge = netFreight + totalSurcharges`
   - レスポンスの `totalNetCharge` と ±1円以内で一致することを検証

### 重複集計防止ルール

同一サーチャージを Shipment レベルと Package レベルの両方から二重に計上しない：

- **shipmentRateDetail.totalSurcharges が明示内訳（surcharges[]）を持つ場合**
  → shipment側の内訳のみ採用

- **そうでない場合**
  → packageRateDetail.surcharges[] を総和

### AHS/Oversize 排他ルール

パッケージ単位で適用：

1. **Oversize がある場合**: Oversize のみ採用、AHS は無効化
2. **Oversize が無い場合**: AHS候補（寸法/重量/梱包/非積載）のうち金額が最大の1つだけ採用
3. 採用額のみ `specialHandling` に計上、`other` からは控除

### Import vs DeliveryArea の厳密分離

以下の列挙値は厳密に分離（誤分類を防止）：

- **Import Processing**: `IMPORT_PROCESSING`, `IMPORT_CLEARANCE`, `CUSTOMS_ENTRY`, `CLEARANCE`, `CUSTOMS_CLEARANCE`
- **Delivery Area**: `DELIVERY_AREA`, `EXTENDED_DELIVERY_AREA`, `REMOTE_AREA`, `ODA`, `OUT_OF_DELIVERY_AREA`

## 実装ファイル

- `src/lib/rates/fedex/mapping.ts` - 列挙値ベースのマッピング定義
- `src/lib/rates/normalizeFedExRate.ts` - 正規化ロジック（再実装）
- `src/components/FedExQuoteResults.tsx` - UI表示（SERVICE_TYPE_DISPLAY_MAP使用、A/Bラベル対応）

## 検証・テスト基準

### Unit テスト

- Delivery Area重複防止: shipmentとpackage両方にDELIVERY_AREAがあっても二重計上しない
- Import vs DeliveryArea: 互いに誤分類しない
- Fuel/Peak: 列挙キーで正しく抽出
- AHS最大1 & Oversize排他: 寸法3390/重量6780/梱包2000 → 6780のみ、Oversize12000があればそれのみ
- 恒等式: `base - discounts + Σsurcharges == totalNet`（±1円以内）

### E2E テスト

- 10kg・80×60×40・同日条件で内訳・順序が公式と一致（数量割引/地域外/寸法/燃料/混雑時）
- Delivery Area が倍付けされない（370 → 370のまま）
- 同寸法×N で数量割引が効く（Phoenix割引はFF OFF）

## 注意事項

- 正規表現は最小限（不明コードのフォールバックのみ）。基本は surchargeType/code の列挙で判定
- 既存の Phoenix 割引は feature flag OFF 維持
- 既存 `extraSurchargesJa` は "表示専用" 維持（合計には入れない）
- RateType は 'ACCOUNT' を既定（List Rate混入を避ける）
- 端数は Math.round に統一、内部は小数OK

