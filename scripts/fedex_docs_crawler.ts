// scripts/fedex_docs_crawler.ts
// Purpose: developer.fedex.com の公開ドキュメントをクロールして Markdown 化・章立て保存
// Usage: pnpx ts-node scripts/fedex_docs_crawler.ts

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
  const main = ("" + ($("main, #content, .content, .container").first().html() || data));
  const md = turndown.turndown(main);

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


