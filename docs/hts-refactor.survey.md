## 画面遷移の現状

- **ステップ順**: shipper → recipient → packages → contents → review → success
- **ナビゲーション（レイアウト定義）**: `src/app/shipping/new/layout.tsx` の `steps` 配列
```9:16:src/app/shipping/new/layout.tsx
const steps = [
  { id: 1, name: '荷送人情報', href: '/shipping/new/shipper' },
  { id: 2, name: '荷受人情報', href: '/shipping/new/recipient' },
  { id: 3, name: '荷物情報', href: '/shipping/new/packages' },
  { id: 4, name: '内容品の詳細', href: '/shipping/new/contents' },
  { id: 5, name: '確認画面', href: '/shipping/new/review' },
  { id: 6, name: '完了', href: '/shipping/new/success' }
]
```

- **実際の遷移コードの例**:
  - packages → contents/hts or contents
```35:43:src/app/shipping/new/packages/page.tsx
// フォーム送信ハンドラー（次のページへの遷移のみ）
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  // 荷物詳細ステップを完了としてマーク
  markStepCompleted('/shipping/new/packages')
  const cc = (useShippingFormStore.getState().recipientInfo?.countryCode || '').toUpperCase()
  if (cc === 'US') router.push('/shipping/new/contents/hts')
  else router.push('/shipping/new/contents')
}
```
  - contents → review
```107:113:src/app/shipping/new/contents/page.tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  
  if (validateForm()) {
    router.push('/shipping/new/review')
}
}
```
  - hts → contents（USのみ必須チェック後）
```52:60:src/app/shipping/new/contents/hts/page.tsx
const handleNext = () => {
  if (!isUS) { router.push('/shipping/new/contents'); return }
  const code = String((recipientInfo as any).htsCode || '')
  if (!/^\d{1,10}$/.test(code)) {
    setHtsError('HTSコードは必須です（半角数字1〜10桁）')
    return
  }
  router.push('/shipping/new/contents')
}
```

---

## US分岐の根拠コード（一次ソース）

- **packages からの分岐**（国コード判定で HTS ステップを挿入）
```39:43:src/app/shipping/new/packages/page.tsx
markStepCompleted('/shipping/new/packages')
const cc = (useShippingFormStore.getState().recipientInfo?.countryCode || '').toUpperCase()
if (cc === 'US') router.push('/shipping/new/contents/hts')
else router.push('/shipping/new/contents')
```
- **HTS ステップ内の非USガード**（非USなら contents に強制遷移）
```25:29:src/app/shipping/new/contents/hts/page.tsx
useEffect(() => {
  if (!isReady) return
  if (!isUS) router.replace('/shipping/new/contents')
}, [isReady, isUS])
```
- **HTS 必須バリデーション（クライアント）**
```74:81:src/app/shipping/new/contents/page.tsx
const validateForm = () => {
  if (isUS) {
    const code = String((recipientInfo as any).htsCode || '')
    if (!/^\d{1,10}$/.test(code)) {
      setHtsError('HTSコードは必須です（半角数字1〜10桁）')
      return false
    }
  }
  // ... 略 ...
  return true
}
```
- **HTS 必須バリデーション（サーバ / 出荷作成 API）**
```116:123:src/app/api/ship/create/route.ts
// HTS code validation: US destination requires numeric up to 10 digits
if ((input?.recipient?.country || '').toUpperCase() === 'US') {
    const code = input.htsCode ?? ''
    const ok = typeof code === 'string' && /^\d{1,10}$/.test(code)
    if (!ok) {
        return NextResponse.json({ error: 'HTS_CODE_REQUIRED' }, { status: 400 })
    }
}
```

---

## contents と contents/hts の UI/項目 差分

- 共通: `Card` レイアウト、`AuthGuard`、ヘッダー、入力値の保持は `useShippingFormStore`
- 差分ポイント（要約）
  - **contents/hts**: HTS コード単独入力 + サジェスト（FEATUREフラグ依存）、Nextで contents へ
  - **contents**: HTS コード（US時のみ必須）に加え、商品行リスト（説明/HSコード/製造国/数量/重量/単価/通貨）、サマリー、Nextで review へ

- 抜粋（HTS 入力とエラーメッセージ、data-test セレクタ）
```165:181:src/app/shipping/new/contents/page.tsx
{isUS && (
  <div className="space-y-2">
    <Label htmlFor="htsCode">HTSコード（米国宛てのみ） <span className="text-red-500">*</span></Label>
    <Input
      id="htsCode"
      value={((recipientInfo as any).htsCode ?? '') as string}
      onChange={(e) => {
        const v = e.target.value.replace(/[\s-]/g, '')
        setHtsError('')
        updateRecipientInfo('htsCode' as any, v)
      }}
      placeholder="例: 0101102030"
      data-test="hts-code"
      className="h-11"
    />
    {htsError && <p className="text-red-600 text-sm" data-test="hts-error">{htsError}</p>}
    {String(process.env.NEXT_PUBLIC_FEATURE_HTS_SUGGESTIONS || '').toLowerCase() === 'true' && suggests.length > 0 && (
      <div className="mt-2 rounded-md border p-2" data-test="hts-suggest-panel">
        {/* ... */}
      </div>
    )}
  </div>
)}
```
```79:93:src/app/shipping/new/contents/hts/page.tsx
<Label htmlFor="htsCode">HTSコード（米国宛てのみ） <span className="text-red-500">*</span></Label>
<Input
  id="htsCode"
  value={((recipientInfo as any).htsCode ?? '') as string}
  onChange={(e) => {
    const v = e.target.value.replace(/[\s-]/g, '')
    setHtsError('')
    updateRecipientInfo('htsCode' as any, v)
  }}
  placeholder="例: 0101102030"
  data-test="hts-code"
  className="h-11"
/>
{htsError && <p className="text-red-600 text-sm" data-test="hts-error">{htsError}</p>}
```

- 共通化可能箇所
  - HTS 入力ブロック（ラベル/正規化/エラービュー/サジェスト部品）
  - `Card` ヘッダー/コンテンツ構造、戻る/次へボタン配置
  - サジェストAPI呼出しの実装（`/api/hts/suggest` + FEATUREフラグ）

- HTS 版で不足/差分（contents と整合させる場合）
  - 商品行エディタ（説明/HS/数量/重量/価格/通貨/製造国）UI
  - 合計サマリー、Error表示、バリデーション統合

---

## HS/HTS 入力欄の実装所在とバリデーション

- UIコンポーネント
  - `src/components/HSCodeAutocomplete.tsx`（品名→HSコード候補の取得と入力）
```63:83:src/components/HSCodeAutocomplete.tsx
// HSコード検索関数
const searchHSCodes = async (searchText: string) => {
  if (!searchText || searchText.length < 2 || !destinationCountryCode) {
    setSuggestions([])
    setShowSuggestions(false)
    return
  }

  setIsLoading(true)
  setError(null)

  try {
    const response = await fetch('/api/shipments/hs-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchText: searchText,
        destinationCountryCode: destinationCountryCode
      }),
    })
```
- contents ページ バリデーション（US時 HTS 必須）: 前掲 `validateForm`
- HTS ページ バリデーション（10桁数値）: 前掲 `handleNext`
- サーバサイド検証: `/api/ship/create`（US宛は `htsCode` 必須）

---

## ルーティング/ガード（app/ ルート構成、middleware、サーバ/クライアント境界）

- ルート構成
  - `src/app/shipping/new/shipper/page.tsx`
  - `src/app/shipping/new/recipient/page.tsx`
  - `src/app/shipping/new/packages/page.tsx`
  - `src/app/shipping/new/contents/page.tsx`
  - `src/app/shipping/new/contents/hts/page.tsx`
  - `src/app/shipping/new/review/page.tsx`
  - `src/app/shipping/new/success/page.tsx`
- ガード
  - `AuthGuard`（クライアント）: 未認証時の遷移はフラグ依存
```31:41:src/components/AuthGuard.tsx
if (requireAuth && !isAuthenticated) {
  if (typeof window !== 'undefined') {
    const enabled = String(process.env.NEXT_PUBLIC_ENABLE_AUTHGUARD_REDIRECT || '').toLowerCase() === 'true'
    if (enabled) {
      const here = window.location.pathname + window.location.search + window.location.hash
      const url = `/login?redirect_to=${encodeURIComponent(here)}`
      window.location.replace(url)
    }
  }
  return null
}
```
  - `middleware.ts`: Supabase セッションを維持
```6:12:src/middleware.ts
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })
  // 認証状態を読み出すことで、必要なら自動的にリフレッシュ＆Set-Cookie が行われる
  await supabase.auth.getSession()
  return res
}
```

---

## 参照している型・スキーマ（types/, schemas/）

- Zustand ストアの型（HTS/HS の所在）: `src/store/shippingFormStore.ts`
```21:35:src/store/shippingFormStore.ts
export interface RecipientInfo {
  contactName: string
  companyName: string
  taxNumber: string
  phoneNumber: string
  email: string
  countryCode: string
  postalCode: string
  cityName: string
  stateCode: string
  address1: string
  address2: string
  isResidential: boolean
  htsCode?: string
}
```
```46:54:src/store/shippingFormStore.ts
export interface ItemInfo {
  description: string
  hsCode: string
  countryOfManufacture: string
  quantity: number
  weight: number
  unitPrice: number
  currency: string
}
```
- API スキーマ（Zod）: `/api/ship/create` の `bodySchema` に `htsCode`
```42:52:src/app/api/ship/create/route.ts
const bodySchema = z.object({
  orderId: z.string().min(1),
  reference: z.string().optional(),
  serviceType: z.string().min(1),
  bill: z.object({ payer: z.enum(['SENDER', 'RECIPIENT', 'THIRD_PARTY']) }),
  shipper: partySchema,
  recipient: partySchema,
  package: pkgSchema.optional(),
  packages: z.array(pkgSchema).min(1).optional(),
  htsCode: z.string().max(10).regex(/^\d+$/).optional(),
})
```

---

## 影響する E2E/Contract テスト と data-test セレクタ

- E2E（Playwright）
  - `tests/e2e/us_hs_required.spec.ts`（US は HTS 必須／エラー表示、API validate があれば 422 確認）
```7:16:tests/e2e/us_hs_required.spec.ts
test('US HTS required (smoke): UI + API', async ({ page }: any) => {
  // Move through steps until Contents step
  await page.goto(`${BASE_URL}/shipping/new/recipient`)
  // minimal required inputs could be filled here if needed; proceed to next page(s)
  await page.goto(`${BASE_URL}/shipping/new/packages`)
  await page.goto(`${BASE_URL}/shipping/new/contents/hts`)

  // Try UI check (best-effort): if HTS field exists on Contents step, ensure empty shows error (client guard)
  const htsInput = page.locator('[data-test="hts-code"]')
```
  - `tests/e2e/non_us_skip_hts.spec.ts`（非USは HTS ステップをスキップ）
```7:16:tests/e2e/non_us_skip_hts.spec.ts
test('Non-US should skip HTS step and go to contents directly', async ({ page }: any) => {
  await page.goto(`${BASE_URL}/shipping/new/recipient`)
  // move to packages and then next -> should reach contents (not contents/hts)
  await page.goto(`${BASE_URL}/shipping/new/packages`)
  // simulate non-US by assumption of default or state; navigate next directly
  await page.goto(`${BASE_URL}/shipping/new/contents`)

  // Ensure we are on contents and HTS input is not shown
  const htsInput = page.locator('[data-test="hts-code"]')
  expect(await htsInput.count()).toBe(0)
})
```
- data-test セレクタ（HTS 関連）
```165:181:src/app/shipping/new/contents/page.tsx
... data-test="hts-code" ... data-test="hts-error" ... data-test="hts-suggest-panel" ... data-test="hts-suggest-item" ...
```
```89:103:src/app/shipping/new/contents/hts/page.tsx
... data-test="hts-code" ... data-test="hts-error" ... data-test="hts-suggest-panel" ... data-test="hts-suggest-item" ...
```

---

## 依存モジュール・型・ユーティリティ

- HTS サジェスト API ルート: `src/app/api/hts/suggest/route.ts`
```14:21:src/app/api/hts/suggest/route.ts
export async function GET(req: NextRequest) {
  try {
    await getUserOrThrow()
  } catch {
    // 認証必須: 未認証は空配列（静かにフォールバック）
    return NextResponse.json([])
  }
```
- サジェスト実装（内部委譲）: `src/lib/hts/suggest.ts`
```16:23:src/lib/hts/suggest.ts
const flag = String(process.env.FEATURE_HTS_SUGGESTIONS || '').trim().toLowerCase()
if (!['1', 'true', 'yes', 'on'].includes(flag)) return []

const hasExportKey = !!process.env.FEDEX_EXPORT_API_KEY
if (!hasExportKey) return []
```
- 認証ミドルウェア: `src/middleware.ts`（セッションクッキーの維持）
- Zustand ストアに `recipientInfo.htsCode`、`items[].hsCode`

---

## 想定改修面（提案のみ）

- a) ルーティング修正ポイント
  - `src/app/shipping/new/packages/page.tsx`（US分岐の一次ソース）
  - `src/app/shipping/new/contents/hts/page.tsx`（非USリダイレクト/Next遷移）
  - `src/app/shipping/new/contents/page.tsx`（US時のHTS必須/Next→review）
  - `src/app/api/ship/create/route.ts`（サーバサイド必須チェック）
- b) 共通フォーム化の候補
  - HTS 入力セクションを独立コンポーネント化して contents/hts 両方で利用
  - サジェストと正規化処理を hooks/util へ抽出
  - 商品行フォーム・サマリーを共有化
- c) テスト更新が必要な箇所
  - US/非USの分岐条件が変わる場合の `tests/e2e/us_hs_required.spec.ts` / `non_us_skip_hts.spec.ts`
  - data-test セレクタの変更がある場合は上記2画面 + review 表示にも反映

---

## 未解決・要確認事項

- `/api/ship/validate` はE2Eで参照されるが、現状ワークスペース内に実装が見当たらない（テスト内で存在しない場合は許容分岐あり）。
- contents と HTS の HTS 入力が二重（どちらで最終確定させるかの責務整理）。
- review → `/api/ship/create` 送信時に `htsCode` が常に `undefined` で構築されている（将来の配線要件）。

---

## 修正着手のための入口ファイル Top5（根拠付き）

1. `src/app/shipping/new/packages/page.tsx`: US 分岐の一次ソース（HTS ステップ挿入トリガ）。
2. `src/app/shipping/new/contents/hts/page.tsx`: 非USリダイレクトと HTS 入力/サジェスト/次へ遷移ロジックの集約点。
3. `src/app/shipping/new/contents/page.tsx`: contents 本体のUI・バリデーション・HTS 入力（US時）併設。UI共通化の中心。
4. `src/app/api/ship/create/route.ts`: サーバサイドの HTS 必須検証（US）の一次ソース。契約テスト/エラーハンドリング影響大。
5. `src/components/HSCodeAutocomplete.tsx`: HSコード入力補助の再利用核。HTS/HSのUI/UX統一の要。
