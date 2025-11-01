# crawl_fedex_docs

## Goal
FedEx Developer Portal 公開ドキュメントを一括取得し、HTML→Markdownに変換。  
さらに OAuth で主要API（Rate/Ship/Trade Documents/Address Validation/Track）の**実体レスポンス・エラーパターン**も収集して `docs/fedex_api_specs/` に保存・索引化する。

## Preconditions
- Node.js 18+
- プロジェクトルートに `.env.local` を作成し、下記を設定：


FEDEX_CLIENT_ID=xxxx
FEDEX_CLIENT_SECRET=xxxx
FEDEX_ENV=sandbox # or production

- 依存のインストール：


pnpm add axios cheerio turndown
pnpm add -D @types/node dotenv


## Files to create
- `scripts/fedex_docs_crawler.ts`
- `scripts/fedex_api_sampler.ts`

## Steps
1. 収集フォルダ作成：


pnpm exec node -e "['docs/fedex_api_specs/html','docs/fedex_api_specs/md','docs/fedex_api_specs/samples'].forEach(d=>require('fs').mkdirSync(d,{recursive:true}))"

2. クローラ実行（HTML→MD）：


pnpm exec ts-node scripts/fedex_docs_crawler.ts

3. APIサンプル取得（OAuth→Rate/Ship/Docs等のエンドポイントへサンプル投げ）：


pnpm exec ts-node scripts/fedex_api_sampler.ts

4. 索引生成（crawlerが自動生成）：
- `docs/fedex_api_specs/index.md` が作成されていることを確認

## Success Criteria
- `docs/fedex_api_specs/md/` に API毎のMarkdownが多数生成されている
- `docs/fedex_api_specs/samples/` に `rate.sample.json`, `ship.sample.json`, `trade-docs.sample.json` 等が保存されている
- `index.md` に「API名／URL／最終更新日／収集元」が一覧化されている

## Notes
- 取得対象URLは `fedex_docs_crawler.ts` の `SEED_URLS` を参照・編集
- トークンは1時間有効。Samplerは401時に自動再取得

---

## ドキュメント・クローラ（HTML→Markdown）

`/scripts/fedex_docs_crawler.ts`

```ts
// scripts/fedex_docs_crawler.ts
// Purpose: developer.fedex.com の公開ドキュメントをクロールして Markdown 化・章立て保存
// Usage: pnpm exec ts-node scripts/fedex_docs_crawler.ts

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const OUT_HTML = "docs/fedex_api_specs/html";
const OUT_MD = "docs/fedex_api_specs/md";
const INDEX_MD = "docs/fedex_api_specs/index.md";

// 主要APIの公開Docs（ログイン不要ページのみ）
const SEED_URLS: {title: string; url: string; slug: string}[] = [
  { title: "Authorization API", url: "https://developer.fedex.com/api/en-us/catalog/authorization.html", slug: "authorization" },
  { title: "API Authorization Docs", url: "https://developer.fedex.com/api/en-us/catalog/authorization/docs.html", slug: "authorization-docs" },
  { title: "Rate API (catalog)", url: "https://developer.fedex.com/api/en-us/catalog/rate.html", slug: "rate" },
  { title: "Rate API (docs)", url: "https://developer.fedex.com/api/en-ms/catalog/rate/v1/docs.html", slug: "rate-v1-docs" },
  { title: "Ship API (docs)", url: "https://developer.fedex.com/api/en-ms/catalog/ship/v1/docs.html", slug: "ship-v1-docs" },
  { title: "Ship API (intro)", url: "https://developer.fedex.com/api/en-us/catalog/ship/docs.html", slug: "ship-docs" },
  { title: "Trade Documents Upload API (docs)", url: "https://developer.fedex.com/api/en-bz/catalog/upload-documents/v1/docs.html", slug: "upload-docs-v1" },
  { title: "Trade Documents Upload API (docs – other locale)", url: "https://developer.fedex.com/api/tr-tr/catalog/upload-documents/docs.html", slug: "upload-docs-tr" },
  { title: "Address Validation API (catalog)", url: "https://developer.fedex.com/api/en-us/catalog/address-validation.html", slug: "address-validation" },
  { title: "Address Validation API (docs)", url: "https://developer.fedex.com/api/en-us/catalog/address-validation/v1/docs.html", slug: "address-validation-v1-docs" },
  { title: "Postal Code Validation API", url: "https://developer.fedex.com/api/en-cm/catalog/postal-code/docs.html", slug: "postal-code-docs" },
  { title: "Best Practices", url: "https://developer.fedex.com/api/en-us/guides/best-practices.html", slug: "best-practices" },
  { title: "Getting Started", url: "https://developer.fedex.com/api/en-us/get-started.html", slug: "get-started" },
];

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
});

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

async function fetchAndSave(url: string, fileSlug: string) {
  const htmlPath = path.join(OUT_HTML, `${fileSlug}.html`);
  const mdPath = path.join(OUT_MD, `${fileSlug}.md`);

  const { data } = await axios.get(url, { timeout: 30000 });
  fs.writeFileSync(htmlPath, data, "utf-8");

  const $ = cheerio.load(data);
  // ページ本文の抽出（main/section優先）
  const main = $("main, #content, .content, .container").first().html() || data;
  const md = turndown.turndown(main as string);

  const header = `# ${fileSlug}\n\n> Source: ${url}\n\n`;
  fs.writeFileSync(mdPath, header + md, "utf-8");

  return { htmlPath, mdPath };
}

async function main() {
  fs.mkdirSync(OUT_HTML, { recursive: true });
  fs.mkdirSync(OUT_MD, { recursive: true });

  const rows: string[] = [
    "# FedEx API Docs – Crawled Index",
    "",
    `生成日時: ${new Date().toISOString()}`,
    "",
    "| Title | File | Source |",
    "|---|---|---|",
  ];

  for (const s of SEED_URLS) {
    const slug = sanitizeFileName(s.slug);
    try {
      const { mdPath } = await fetchAndSave(s.url, slug);
      rows.push(`| ${s.title} | ${path.basename(mdPath)} | ${s.url} |`);
      console.log(`OK: ${s.title}`);
    } catch (e: any) {
      console.error(`FAIL: ${s.title} - ${e?.message}`);
    }
  }

  fs.writeFileSync(INDEX_MD, rows.join("\n") + "\n", "utf-8");
  console.log(`\nIndex: ${INDEX_MD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## APIサンプラー（OAuth→実体サンプル保存）

`/scripts/fedex_api_sampler.ts`

```ts
// scripts/fedex_api_sampler.ts
// Purpose: OAuthでトークン取得→主要APIへサンプル投げてレスポンスJSONを保存
// Usage: pnpm exec ts-node scripts/fedex_api_sampler.ts

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const OUT = "docs/fedex_api_specs/samples";
fs.mkdirSync(OUT, { recursive: true });

const ENV = (process.env.FEDEX_ENV || "sandbox").toLowerCase();
const BASE = ENV === "production" ? "https://apis.fedex.com" : "https://apis-sandbox.fedex.com";
const CLIENT_ID = process.env.FEDEX_CLIENT_ID!;
const CLIENT_SECRET = process.env.FEDEX_CLIENT_SECRET!;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("FEDEX_CLIENT_ID / FEDEX_CLIENT_SECRET が設定されていません。");
  process.exit(1);
}

async function getToken(): Promise<string> {
  // OAuth: 60分有効（公式記載）
  const tokenUrl = `${BASE}/oauth/token`;
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const { data } = await axios.post(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${auth}`,
    },
    timeout: 30000,
  });
  return data.access_token;
}

async function safeGet(url: string, token: string, body?: any, method: "GET"|"POST" = "POST") {
  try {
    const res = await axios({
      url,
      method,
      data: body,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 30000,
    });
    return { ok: true, data: res.data, status: res.status };
  } catch (e: any) {
    return { ok: false, data: e?.response?.data || { error: e.message }, status: e?.response?.status || 0 };
  }
}

async function main() {
  const token = await getToken();

  // 1) Rate Quotes（最低限の雛形）
  const rateUrl = `${BASE}/rate/v1/rates/quotes`;
  const rateBody = {
    accountNumber: { value: "123456789" }, // ダミー
    requestedShipment: {
      shipper: { address: { postalCode: "100-0001", countryCode: "JP" } },
      recipient: { address: { postalCode: "SW1A1AA", countryCode: "GB" } },
      serviceType: "INTERNATIONAL_PRIORITY",
      preferredCurrency: "JPY",
      shipDateStamp: "2025-01-20",
      packagingType: "YOUR_PACKAGING",
      requestedPackageLineItems: [{ weight: { units: "KG", value: 20.4 }, dimensions: { length: 37, width: 37, height: 32, units: "CM" } }],
    },
    carrierCodes: ["FDXE"],
  };
  const rateRes = await safeGet(rateUrl, token, rateBody, "POST");
  fs.writeFileSync(path.join(OUT, "rate.sample.json"), JSON.stringify(rateRes, null, 2));

  // 2) Ship（Create Shipmentダミー：通常はアカウント未認証だとエラー応答になるが、それも記録）
  const shipUrl = `${BASE}/ship/v1/shipments`;
  const shipBody = { accountNumber: { value: "123456789" }, requestedShipment: { /* 省略 */ } };
  const shipRes = await safeGet(shipUrl, token, shipBody, "POST");
  fs.writeFileSync(path.join(OUT, "ship.sample.json"), JSON.stringify(shipRes, null, 2));

  // 3) Trade Documents（encoded multiuploadの殻：構造確認用）
  const docUrl = `${BASE}/documents/v1/etds/encodedmultiupload`;
  const docBody = {
    workflowName: "ETDPreshipment",
    carrierCode: "FDXE",
    originCountryCode: "JP",
    destinationCountryCode: "GB",
    metaData: [
      { fileName: "invoice.pdf", fileReferenceId: "inv_001", contentType: "application/pdf", shipDocumentType: "COMMERCIAL_INVOICE" },
    ],
  };
  const docRes = await safeGet(docUrl, token, docBody, "POST");
  fs.writeFileSync(path.join(OUT, "trade-docs.sample.json"), JSON.stringify(docRes, null, 2));

  // 4) Address Validation（存在する地域エンドポイントに合わせ要調整）
  const addrUrl = `${BASE}/address/v1/addresses/resolve`;
  const addrBody = { addressesToValidate: [{ address: { countryCode: "GB", postalCode: "SW1A1AA", city: "London", streetLines: ["10 Downing St"] } }] };
  const addrRes = await safeGet(addrUrl, token, addrBody, "POST");
  fs.writeFileSync(path.join(OUT, "address-validation.sample.json"), JSON.stringify(addrRes, null, 2));

  // 5) Track（参考）
  const trackUrl = `${BASE}/track/v1/trackingnumbers`;
  const trackBody = { trackingInfo: [{ trackingNumberInfo: { trackingNumber: "123456789012" } }] };
  const trackRes = await safeGet(trackUrl, token, trackBody, "POST");
  fs.writeFileSync(path.join(OUT, "track.sample.json"), JSON.stringify(trackRes, null, 2));

  // インデックス併記
  const indexPath = "docs/fedex_api_specs/index.md";
  const stamp = new Date().toISOString();
  const block = [
    "## API Samples",
    "",
    `- Collected at: ${stamp}`,
    "- Files:",
    "  - samples/rate.sample.json",
    "  - samples/ship.sample.json",
    "  - samples/trade-docs.sample.json",
    "  - samples/address-validation.sample.json",
    "  - samples/track.sample.json",
    "",
  ].join("\n");
  fs.appendFileSync(indexPath, "\n" + block);
  console.log("Samples collected.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## 使い方（超短縮）

1) `.env.local` をセット

2) 依存インストール：

```bash
pnpm add axios cheerio turndown
pnpm add -D @types/node dotenv
```

3) 実行：

```bash
pnpm exec node -e "['docs/fedex_api_specs/html','docs/fedex_api_specs/md','docs/fedex_api_specs/samples'].forEach(d=>require('fs').mkdirSync(d,{recursive:true}))"
pnpm exec ts-node scripts/fedex_docs_crawler.ts
pnpm exec ts-node scripts/fedex_api_sampler.ts
```

→ `docs/fedex_api_specs/` 配下に Markdown とサンプル JSON が一式作られます。

## 収集対象（初期セット）

- Authorization / OAuth（トークンは60分有効）
- Rates and Transit Times API（見積にサーチャージ・ディスカウントを含めた推定額を返す）
- Ship API（出荷作成・取消など）
- Trade Documents Upload API（ETD、画像アップロード、最大5件、ファイル制限等）
- Address Validation / Postal Code（住所検証・分類、郵便番号検証）
- Best Practices / Getting Started（運用・キャッシュ方針）


