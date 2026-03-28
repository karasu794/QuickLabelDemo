#!/usr/bin/env tsx
/**
 * レート観測の自動スイープ
 * 
 * matrix.jsonから組合せを生成し、Rate APIを順次呼び出してログを保存
 */

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getFedExAccessToken, getFedExCredentialsByOrigin, fedexApiRequest } from "@/lib/fedex/auth";
import { throttle } from "@/lib/fedex/httpLimiter";
import { normalizeFedExRate } from "@/lib/rates/normalizeFedExRate";

const MATRIX_FILE = join(process.cwd(), "scripts", "rates", "matrix.json");
const OUT_ROOT = join(process.cwd(), "artifacts", "rate_logs");

interface Matrix {
  origins: string[];
  destinations: string[];
  weightBands: Array<{ min: number; max: number }>;
  services: string[];
  flags: Array<{ isResidential: boolean }>;
  dimensions: Array<{ length: number; width: number; height: number } | null>;
}

interface TestCase {
  origin: string;
  destination: string;
  weight: number;
  service: string;
  isResidential: boolean;
  dimensions: { length: number; width: number; height: number } | null;
}

// マトリックスからテストケースを生成
function generateTestCases(matrix: Matrix): TestCase[] {
  const cases: TestCase[] = [];

  for (const origin of matrix.origins) {
    for (const destination of matrix.destinations) {
      for (const weightBand of matrix.weightBands) {
        // 重量帯の中間値を使用
        const weight = (weightBand.min + weightBand.max) / 2;
        
        for (const service of matrix.services) {
          for (const flag of matrix.flags) {
            for (const dims of matrix.dimensions) {
              cases.push({
                origin,
                destination,
                weight,
                service,
                isResidential: flag.isResidential,
                dimensions: dims,
              });
            }
          }
        }
      }
    }
  }

  return cases;
}

// Rate APIリクエスト構築
function buildRateRequest(case_: TestCase): any {
  const credentials = getFedExCredentialsByOrigin(case_.origin);
  const shipDate = new Date().toISOString().split("T")[0];

  return {
    accountNumber: {
      value: credentials.accountNumber,
    },
    requestedShipment: {
      shipper: {
        address: {
          postalCode: "1000001", // 東京（簡易）
          countryCode: case_.origin,
          city: "Tokyo",
        },
      },
      recipient: {
        address: {
          postalCode: case_.destination === "US" ? "10001" : case_.destination === "CA" ? "M5H 2N2" : "SW1A 1AA",
          countryCode: case_.destination,
          city: case_.destination === "US" ? "New York" : case_.destination === "CA" ? "Toronto" : "London",
          residential: case_.isResidential,
        },
      },
      shipDatestamp: shipDate,
      rateRequestType: ["ACCOUNT", "LIST"],
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: {
              value: credentials.accountNumber,
            },
          },
        },
      },
      requestedPackageLineItems: [
        {
          sequenceNumber: 1,
          groupPackageCount: 1,
          weight: {
            units: "KG",
            value: case_.weight,
          },
          ...(case_.dimensions && {
            dimensions: {
              length: case_.dimensions.length,
              width: case_.dimensions.width,
              height: case_.dimensions.height,
              units: "CM",
            },
          }),
        },
      ],
    },
  };
}

// ケースID生成
function generateCaseId(case_: TestCase, index: number): string {
  return `C${String(index + 1).padStart(4, "0")}_${case_.origin}_${case_.destination}_${case_.weight.toFixed(1)}kg_${case_.service}_${case_.isResidential ? "RES" : "COM"}`;
}

async function main() {
  console.log("📊 レート観測開始...");

  // マトリックス読み込み
  const matrix: Matrix = JSON.parse(readFileSync(MATRIX_FILE, "utf8"));
  const testCases = generateTestCases(matrix);
  console.log(`生成されたテストケース: ${testCases.length}件`);

  // 出力ディレクトリ作成
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const outDir = join(OUT_ROOT, timestamp);
  mkdirSync(outDir, { recursive: true });

  const failedCases: Array<{ caseId: string; error: string }> = [];
  let successCount = 0;
  let failCount = 0;

  // 各ケースを実行
  for (let i = 0; i < testCases.length; i++) {
    const case_ = testCases[i];
    const caseId = generateCaseId(case_, i);

    try {
      // アクセストークン取得
      const accessToken = await getFedExAccessToken(case_.origin);

      // リクエスト構築
      const requestBody = buildRateRequest(case_);

      // Rate API呼び出し（レート制限対応）
      const response = await throttle(async () => {
        return await fedexApiRequest<any>(
          "/rate/v1/rates/quotes",
          "POST",
          accessToken,
          requestBody
        );
      });

      if (response.errors && response.errors.length > 0) {
        throw new Error(`FedEx API Error: ${response.errors[0].code} - ${response.errors[0].message}`);
      }

      // 正規化
      const normalized: Record<string, any> = {};
      if (response.output?.rateReplyDetails) {
        for (const detail of response.output.rateReplyDetails) {
          const serviceType = detail.serviceType || "UNKNOWN";
          normalized[serviceType] = normalizeFedExRate(detail, "JPY");
        }
      }

      // ログ保存
      const requestFile = join(outDir, `${caseId}_request.json`);
      const responseFile = join(outDir, `${caseId}_response.json`);
      const normalizedFile = join(outDir, `${caseId}_normalized.json`);

      writeFileSync(requestFile, JSON.stringify(requestBody, null, 2), "utf8");
      writeFileSync(responseFile, JSON.stringify(response, null, 2), "utf8");
      writeFileSync(normalizedFile, JSON.stringify(normalized, null, 2), "utf8");

      successCount++;

      // 進捗表示（10件ごと）
      if ((i + 1) % 10 === 0) {
        console.log(`進捗: ${i + 1}/${testCases.length} (成功: ${successCount}, 失敗: ${failCount})`);
      }
    } catch (error) {
      failCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ ケース ${caseId} 失敗:`, errorMsg);

      // 再試行（最大2回）
      let retried = false;
      for (let retry = 0; retry < 2; retry++) {
        try {
          await new Promise((r) => setTimeout(r, 2000)); // 2秒待機
          const accessToken = await getFedExAccessToken(case_.origin);
          const requestBody = buildRateRequest(case_);
          const response = await throttle(async () => {
            return await fedexApiRequest<any>(
              "/rate/v1/rates/quotes",
              "POST",
              accessToken,
              requestBody
            );
          });

          if (!response.errors || response.errors.length === 0) {
            retried = true;
            successCount++;
            failCount--;
            break;
          }
        } catch {
          // 再試行も失敗
        }
      }

      if (!retried) {
        failedCases.push({ caseId, error: errorMsg });
      }
    }
  }

  // 失敗ケースを保存
  if (failedCases.length > 0) {
    const failedFile = join(outDir, "failed_cases.json");
    writeFileSync(failedFile, JSON.stringify(failedCases, null, 2), "utf8");
    console.log(`⚠️  失敗ケース: ${failedCases.length}件 → ${failedFile}`);
  }

  console.log("\n✅ レート観測完了");
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${failCount}件`);
  console.log(`出力ディレクトリ: ${outDir}`);
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});

