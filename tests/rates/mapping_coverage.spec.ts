import { describe, it, expect } from "vitest";
import { normalizeFedExRate } from "@/lib/rates/normalizeFedExRate";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CASES_DIR = join(process.cwd(), "tests", "fixtures", "rates", "cases");

interface ExpectedLine {
  key: string;
  present: boolean;
  approxPct?: number; // 許容誤差率（±%）
}

interface TestCase {
  title: string;
  request: any;
  response: any;
  expectedLines: ExpectedLine[];
}

// テストケースを読み込み
function loadTestCases(): TestCase[] {
  const cases: TestCase[] = [];
  
  try {
    const files = readdirSync(CASES_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const content = readFileSync(join(CASES_DIR, file), "utf8");
      const testCase = JSON.parse(content) as TestCase;
      cases.push(testCase);
    }
  } catch (error) {
    // ディレクトリが存在しない場合は空配列を返す
    console.warn(`テストケースディレクトリが見つかりません: ${CASES_DIR}`);
  }

  return cases;
}

describe("rates:coverage", () => {
  const testCases = loadTestCases();

  if (testCases.length === 0) {
    it.skip("テストケースがありません", () => {});
    return;
  }

  for (const testCase of testCases) {
    it(testCase.title, () => {
      // レスポンスを正規化
      const normalized = normalizeFedExRate(testCase.response, "JPY");

      // 各行の検証
      const failures: string[] = [];

      for (const expected of testCase.expectedLines) {
        const actual = normalized[expected.key as keyof typeof normalized];
        const actualAmount = typeof actual === "object" && actual !== null && "amount" in actual
          ? (actual as { amount: number }).amount
          : typeof actual === "number"
          ? actual
          : null;

        // present チェック
        const isPresent = actualAmount != null && actualAmount !== 0;
        if (isPresent !== expected.present) {
          failures.push(
            `${expected.key}: present不一致 (期待: ${expected.present}, 実際: ${isPresent})`
          );
          continue;
        }

        // approxPct チェック（present=trueの場合）
        if (expected.present && expected.approxPct != null && actualAmount != null) {
          const total = normalized.total?.amount || 0;
          if (total > 0) {
            const actualPct = (actualAmount / total) * 100;
            const tolerance = expected.approxPct;
            if (Math.abs(actualPct - expected.approxPct) > tolerance) {
              failures.push(
                `${expected.key}: 割合不一致 (期待: ${expected.approxPct}±${tolerance}%, 実際: ${actualPct.toFixed(2)}%)`
              );
            }
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(`検証失敗:\n${failures.join("\n")}`);
      }
    });
  }
});

