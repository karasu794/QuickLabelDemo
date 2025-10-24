// scripts/fedex_docs_examples_extractor.ts
// Purpose: developer.fedex.com から保存済みの公開HTMLを走査し、JSON例を抽出して保存
// Usage: pnpx ts-node scripts/fedex_docs_examples_extractor.ts

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import axios from "axios";

const HTML_DIR = "docs/fedex_api_specs/html";
const OUT_DIR = "docs/fedex_api_specs/samples/docs-examples";
const INDEX_MD = "docs/fedex_api_specs/index.md";
const FEDEX_BASE = "https://developer.fedex.com";

function listHtmlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".html"))
    .map((f) => path.join(dir, f));
}

function extractTextBlocksFromHtml(html: string): string[] {
  const $ = cheerio.load(html);
  const snippets: string[] = [];

  $("pre, code").each((_, el) => {
    const t = $(el).text();
    if (!t) return;
    const text = t.trim();
    if (!text) return;
    if (text.includes("{") && text.includes("}")) {
      // 粗いフィルタ：JSONらしきもの
      snippets.push(text);
    }
  });

  // script[type="application/json"] 等も対象
  $("script[type='application/json'], script[type='application/ld+json']").each((_, el) => {
    const t = $(el).html();
    if (!t) return;
    const text = t.trim();
    if (!text) return;
    if (text.includes("{") && text.includes("}")) snippets.push(text);
  });

  // 重複除去（ホワイトスペースを均しつつ）
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of snippets) {
    const key = s.replace(/\s+/g, " ");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  return unique;
}

function tryParseJson(raw: string): { ok: boolean; jsonText?: string } {
  const deFenced = raw
    .replace(/^```[a-zA-Z0-9_-]*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();

  const first = deFenced.indexOf("{");
  const last = deFenced.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return { ok: false };

  const candidate = deFenced.slice(first, last + 1);
  try {
    const parsed = JSON.parse(candidate);
    return { ok: true, jsonText: JSON.stringify(parsed, null, 2) };
  } catch {
    return { ok: false };
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fetchAndPersist(urlPath: string, outBaseName: string): Promise<string | null> {
  const url = urlPath.startsWith('http') ? urlPath : FEDEX_BASE + urlPath;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const contentType = (res.headers['content-type'] as string | undefined) || '';
    let ext = '.bin';
    if (contentType.includes('application/json') || contentType.includes('text/json') || contentType.includes('text/plain')) {
      ext = '.json';
    } else if (contentType.includes('zip')) {
      ext = '.zip';
    } else if (contentType.includes('xml')) {
      ext = '.xml';
    }
    const outFile = path.join(OUT_DIR, `${outBaseName}${ext}`);
    fs.writeFileSync(outFile, res.data);
    return `samples/docs-examples/${path.basename(outFile)}`;
  } catch (e) {
    // Silent fail per file
    return null;
  }
}

function collectHiddenResourcePaths($: cheerio.CheerioAPI): string[] {
  const paths: string[] = [];
  const addPath = (p?: string | null) => {
    if (!p) return;
    const trimmed = p.trim();
    if (!trimmed) return;
    paths.push(trimmed);
  };

  // Known hidden inputs
  const valSwagger = $("input#swaggerjson").attr('value');
  if (valSwagger) {
    const decoded = decodeHtmlEntities(valSwagger);
    try {
      const arr = JSON.parse(decoded);
      if (Array.isArray(arr)) {
        for (const it of arr) {
          if (it && typeof it.path === 'string') addPath(it.path);
        }
      }
    } catch {
      // ignore
    }
  }

  addPath($("input#errorjson").attr('value') || undefined);
  addPath($("input#apiintrojson").attr('value') || undefined);
  addPath($("input#postmanclctnUrl").attr('value') || undefined);
  addPath($("input#postmanclctnURL").attr('value') || undefined);

  // Any other hidden input whose value looks like a JSON path
  $("input[type='hidden']").each((_, el) => {
    const v = $(el).attr('value');
    const id = ($(el).attr('id') || '').toLowerCase();
    if (!v) return;
    if (id.includes('json') || /\.json(\?|$)/i.test(v) || /jsonapi-collections/i.test(v)) {
      addPath(decodeHtmlEntities(v));
    }
  });

  // De-duplicate
  return Array.from(new Set(paths));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = listHtmlFiles(HTML_DIR);
  const savedFiles: string[] = [];

  for (const htmlPath of files) {
    const base = path.basename(htmlPath, ".html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    const textBlocks = extractTextBlocksFromHtml(html);

    let idx = 0;
    for (const block of textBlocks) {
      const res = tryParseJson(block);
      const outName = `${base}-${String(idx).padStart(2, "0")}`;
      if (res.ok && res.jsonText) {
        const p = path.join(OUT_DIR, `${outName}.json`);
        fs.writeFileSync(p, res.jsonText, "utf-8");
        savedFiles.push(`samples/docs-examples/${path.basename(p)}`);
      } else {
        // 解析失敗でも原文を残す
        const p = path.join(OUT_DIR, `${outName}.raw.json`);
        fs.writeFileSync(p, block, "utf-8");
        savedFiles.push(`samples/docs-examples/${path.basename(p)}`);
      }
      idx++;
    }

    // Hidden resource paths (OpenAPI, error mappings, intros, postman collections, etc.)
    const $ = cheerio.load(html);
    const resourcePaths = collectHiddenResourcePaths($);
    let ridx = 0;
    for (const p of resourcePaths) {
      const outName = `${base}-res-${String(ridx).padStart(2, '0')}`;
      const saved = await fetchAndPersist(p, outName);
      if (saved) savedFiles.push(saved);
      ridx++;
    }
  }

  if (savedFiles.length > 0) {
    const stamp = new Date().toISOString();
    const lines = [
      "\n## Docs Examples",
      "",
      `- Collected at: ${stamp}`,
      "- Files:",
      ...savedFiles.map((f) => `  - ${f}`),
      "",
    ];
    fs.appendFileSync(INDEX_MD, lines.join("\n"));
  }

  console.log(`Extracted ${savedFiles.length} example file(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


