// scripts/fedex_api_sampler.ts
// Purpose: OAuthでトークン取得→主要APIへサンプル投げてレスポンスJSONを保存
// Usage: pnpx ts-node scripts/fedex_api_sampler.ts

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
  // OAuth: 60分有効（公式記載）。
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
  let token = await getToken();

  const tryCall = async (name: string, url: string, body: any, method: "GET"|"POST" = "POST") => {
    let res = await safeGet(url, token, body, method);
    if (!res.ok && res.status === 401) {
      token = await getToken();
      res = await safeGet(url, token, body, method);
    }
    fs.writeFileSync(path.join(OUT, `${name}.sample.json`), JSON.stringify(res, null, 2));
    return res;
  };

  // 1) Rate Quotes（最低限の雛形）
  await tryCall("rate", `${BASE}/rate/v1/rates/quotes`, {
    accountNumber: { value: "123456789" },
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
  });

  // 2) Ship（Create Shipmentダミー：通常はアカウント未認証だとエラー応答になるが、それも記録）
  await tryCall("ship", `${BASE}/ship/v1/shipments`, { accountNumber: { value: "123456789" }, requestedShipment: {} });

  // 3) Trade Documents（encoded multiuploadの殻：構造確認用）
  await tryCall("trade-docs", `${BASE}/documents/v1/etds/encodedmultiupload`, {
    workflowName: "ETDPreshipment",
    carrierCode: "FDXE",
    originCountryCode: "JP",
    destinationCountryCode: "GB",
    metaData: [
      { fileName: "invoice.pdf", fileReferenceId: "inv_001", contentType: "application/pdf", shipDocumentType: "COMMERCIAL_INVOICE" },
    ],
  });

  // 4) Address Validation（存在する地域エンドポイントに合わせ要調整）
  await tryCall("address-validation", `${BASE}/address/v1/addresses/resolve`, { addressesToValidate: [{ address: { countryCode: "GB", postalCode: "SW1A1AA", city: "London", streetLines: ["10 Downing St"] } }] });

  // 5) Track（参考）
  await tryCall("track", `${BASE}/track/v1/trackingnumbers`, { trackingInfo: [{ trackingNumberInfo: { trackingNumber: "123456789012" } }] });

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


