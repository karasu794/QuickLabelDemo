## Stage4 DEV NOTES

### TokenPdfBuilder 仕様
- A4: 595x842pt, margin=68pt
- ヘッダ領域: x=68, y=842-68-96, w=595-136, h=96
- 署名領域: x=595-68-200, y=68, w=200, h=72
- 出力トークン:
  - `FQL:PAGE@595,842,M=68`
  - `FQL:HEADER@x,y,w,h|URL=<...>`
  - `FQL:SIGN@x,y,w,h|URL=<...>`
  - `FQL:EOF`

### 差し替え戦略
- `IInvoicePdfBuilder` を満たす `pdf-lib.builder.ts` を追加すれば差し替え可能
- Facade (`commercialInvoiceTemplate.ts`) は Builder への依存のみ


