const REDACT_PATTERNS = [
  /\b(eyJhbGciOi|eyJ0eXAiOi)[\w\.-]+/g, // JWT っぽい文字列
  /\b(?:\d[ -]?){12,19}\b/g, // カード/長い番号の疑い
  /\b[A-Za-z0-9_]{20,}\b/g, // 長いAPIキーっぽい
  /\b(access_token|client_secret)\b["']?\s*[:=]\s*["'][^"']+/gi,
  /\b\d{7,}\b/g, // 口座/伝票番号的な長数字
];

export function safeLog(input: unknown): string {
  let s = typeof input === "string" ? input : JSON.stringify(input);
  for (const p of REDACT_PATTERNS) s = s.replace(p, "[REDACTED]");
  return s;
}

