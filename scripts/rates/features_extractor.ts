#!/usr/bin/env tsx
/**
 * レート誤差の特徴量抽出
 * 
 * artifacts/rate_logs/ 配下のログから特徴量を抽出し、
 * artifacts/rate_analysis/features.jsonl に出力
 */

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { FeatureSchema, type Feature } from "./schema.js";

const LOG_DIR = join(process.cwd(), "artifacts", "rate_logs");
const OUT_DIR = join(process.cwd(), "artifacts", "rate_analysis");
const FEATURES_FILE = join(OUT_DIR, "features.jsonl");

// 安全ログ（PII除去）
function safeLog(input: unknown): string {
  let s = typeof input === "string" ? input : JSON.stringify(input);
  // 郵便番号・アカウント番号などをマスキング
  s = s.replace(/\b\d{3,4}-?\d{4}\b/g, "[POSTAL]");
  s = s.replace(/\b\d{9,}\b/g, "[NUMBER]");
  return s;
}

// 重量帯の分類
function classifyWeightBand(weightKg: number): string {
  if (weightKg < 1) return "0-1";
  if (weightKg < 5) return "1-5";
  if (weightKg < 10) return "5-10";
  return "10+";
}

// 郵便番号からゾーン推定（簡易版）
function estimateZone(postalCode?: string, country?: string): string | undefined {
  if (!postalCode || !country) return undefined;
  // US/CAの場合は最初の数桁で推定可能だが、簡易実装では "unknown" を返す
  if (country === "US" && postalCode.match(/^\d{5}/)) {
    const first3 = postalCode.substring(0, 3);
    // 簡易ゾーン推定（実際はFedExのゾーンテーブルが必要）
    return `zone_${first3}`;
  }
  return "unknown";
}

// 誤差計算
function calculateError(expected: number, actual: number): {
  magnitude: number;
  sign: number;
  pct: number;
} {
  const magnitude = Math.abs(actual - expected);
  const sign = actual > expected ? 1 : actual < expected ? -1 : 0;
  const pct = expected !== 0 ? (magnitude / expected) * 100 : 0;
  return { magnitude, sign, pct };
}

// 不一致種類の抽出
function extractMismatchKinds(
  request: any,
  response: any,
  normalized: any
): string[] {
  const mismatches: string[] = [];
  
  // baseの不一致
  const basePresent = normalized?.base != null && normalized.base > 0;
  if (!basePresent && request.requestedShipment) {
    mismatches.push("base_missing");
  }

  // fuelの不一致
  const fuelPresent = normalized?.fuel != null && normalized.fuel > 0;
  const hasFuelSurcharge = response?.output?.rateReplyDetails?.some((r: any) =>
    r.ratedShipmentDetails?.some((rd: any) =>
      rd.surcharges?.some((s: any) => s.surchargeType === "FUEL_SURCHARGE")
    )
  );
  if (fuelPresent !== hasFuelSurcharge) {
    mismatches.push("fuel_mismatch");
  }

  // delivery_areaの不一致
  const daPresent = normalized?.delivery_area != null && normalized.delivery_area > 0;
  const hasDA = response?.output?.rateReplyDetails?.some((r: any) =>
    r.ratedShipmentDetails?.some((rd: any) =>
      rd.surcharges?.some((s: any) => s.surchargeType?.includes("DELIVERY_AREA"))
    )
  );
  if (daPresent !== hasDA) {
    mismatches.push("delivery_area_mismatch");
  }

  // discountの不一致
  const discountPresent = normalized?.discount != null && normalized.discount < 0;
  const hasDiscount = response?.output?.rateReplyDetails?.some((r: any) =>
    r.ratedShipmentDetails?.some((rd: any) => rd.totalDiscounts?.amount != null)
  );
  if (discountPresent !== hasDiscount) {
    mismatches.push("discount_mismatch");
  }

  return mismatches;
}

// ログファイルを走査
function walkLogs(dir: string): Array<{ runId: string; files: Record<string, string> }> {
  const runs: Array<{ runId: string; files: Record<string, string> }> = [];
  
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    console.warn(`ログディレクトリが見つかりません: ${dir}`);
    return runs;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const runId = entry.name;
      const runDir = join(dir, runId);
      const files: Record<string, string> = {};
      
      for (const file of readdirSync(runDir)) {
        if (file.endsWith("_request.json")) files.request = join(runDir, file);
        else if (file.endsWith("_response.json")) files.response = join(runDir, file);
        else if (file.endsWith("_normalized.json")) files.normalized = join(runDir, file);
        else if (file === "mapping_output.log") files.mapping = join(runDir, file);
      }
      
      if (files.request && files.response) {
        runs.push({ runId, files });
      }
    } else if (entry.name.endsWith(".json")) {
      // レガシー形式: artifacts/fedex_logs/YYYYMMDD/run_TIMESTAMP.json
      const runId = basename(dir);
      const files: Record<string, string> = { combined: join(dir, entry.name) };
      runs.push({ runId, files });
    }
  }

  return runs;
}

// 特徴量抽出
function extractFeatures(runId: string, files: Record<string, string>): Feature[] {
  const features: Feature[] = [];

  try {
    let request: any;
    let response: any;
    let normalized: any;

    if (files.combined) {
      // レガシー形式
      const combined = JSON.parse(readFileSync(files.combined, "utf8"));
      request = combined.request;
      response = combined.fedexRaw || combined.response;
      normalized = combined.normalized;
    } else {
      if (files.request) {
        request = JSON.parse(readFileSync(files.request, "utf8"));
      }
      if (files.response) {
        response = JSON.parse(readFileSync(files.response, "utf8"));
      }
      if (files.normalized) {
        normalized = JSON.parse(readFileSync(files.normalized, "utf8"));
      }
    }

    if (!request || !response) return features;

    const reqShipment = request.requestedShipment || request;
    const origin = reqShipment.shipper?.address || reqShipment.origin?.address || {};
    const dest = reqShipment.recipient?.address || reqShipment.destination?.address || reqShipment.recipients?.[0]?.address || {};

    const originCountry = origin.countryCode || reqShipment.shipperCountryCode || "UNKNOWN";
    const destCountry = dest.countryCode || reqShipment.recipientCountryCode || "UNKNOWN";
    const originPostal = origin.postalCode || reqShipment.shipperPostalCode;
    const destPostal = dest.postalCode || reqShipment.recipientPostalCode;
    const isResidential = dest.residential || reqShipment.isResidential || false;

    const rateReplyDetails = response.output?.rateReplyDetails || response.rateReplyDetails || [];
    
    for (const rateDetail of rateReplyDetails) {
      const serviceType = rateDetail.serviceType || "UNKNOWN";
      const ratedDetails = rateDetail.ratedShipmentDetails?.[0] || {};
      const totalNetCharge = ratedDetails.totalNetCharge?.amount || 0;
      const totalNetChargeCurrency = ratedDetails.totalNetCharge?.currency || "JPY";

      // パッケージ情報
      const pkg = reqShipment.requestedPackageLineItems?.[0] || {};
      const weightKg = pkg.weight?.value || 0;
      const dims = pkg.dimensions;
      const hasDimensions = !!(dims?.length && dims?.width && dims?.height);
      const dimsVolume = hasDimensions
        ? (dims.length * dims.width * dims.height)
        : undefined;

      // 正規化結果から期待値を取得
      const normalizedForService = normalized?.[serviceType] || normalized?.normalized?.[serviceType];
      const expectedTotal = normalizedForService?.total?.amount || totalNetCharge;

      // 誤差計算
      const error = calculateError(expectedTotal, totalNetCharge);

      // フラグ抽出
      const surcharges = ratedDetails.surcharges || [];
      const hasFuel = surcharges.some((s: any) => s.surchargeType === "FUEL_SURCHARGE");
      const hasDeliveryArea = surcharges.some((s: any) =>
        s.surchargeType?.includes("DELIVERY_AREA")
      );
      const hasPeak = surcharges.some((s: any) => s.surchargeType?.includes("PEAK"));
      const hasBase = ratedDetails.totalBaseCharge?.amount != null;
      const hasDiscount = ratedDetails.totalDiscounts?.amount != null;
      const hasOtherSurcharges = surcharges.some(
        (s: any) =>
          !["FUEL_SURCHARGE", "DELIVERY_AREA"].some((t) => s.surchargeType?.includes(t))
      );

      // 不一致種類
      const mismatchKinds = extractMismatchKinds(request, response, normalizedForService);

      const feature: Feature = {
        caseId: `${runId}_${serviceType}`,
        timestamp: new Date().toISOString(),
        runId,
        originCountry,
        destCountry,
        originPostalCode: originPostal,
        destPostalCode: destPostal,
        zone: estimateZone(destPostal, destCountry),
        serviceType,
        weightKg,
        weightBand: classifyWeightBand(weightKg),
        hasDimensions,
        dimsVolumeCm3: dimsVolume,
        isResidential,
        hasDeliveryArea,
        hasFuel,
        hasDiscount,
        hasBase,
        hasPeak,
        hasOtherSurcharges,
        errorMagnitude: error.magnitude,
        errorSign: error.sign,
        errorPct: error.pct,
        expectedTotal,
        actualTotal: totalNetCharge,
        mismatchKinds,
      };

      // バリデーション
      const result = FeatureSchema.safeParse(feature);
      if (result.success) {
        features.push(result.data);
      } else {
        console.warn(`特徴量抽出エラー (${runId}/${serviceType}):`, result.error);
      }
    }
  } catch (error) {
    console.error(`ログ解析エラー (${runId}):`, error);
  }

  return features;
}

async function main() {
  console.log("📊 特徴量抽出開始...");
  console.log(`ログディレクトリ: ${LOG_DIR}`);

  mkdirSync(OUT_DIR, { recursive: true });

  const runs = walkLogs(LOG_DIR);
  console.log(`見つかった実行: ${runs.length}件`);

  const allFeatures: Feature[] = [];

  for (const { runId, files } of runs) {
    const features = extractFeatures(runId, files);
    allFeatures.push(...features);
    if (features.length > 0) {
      console.log(`  ${runId}: ${features.length}件の特徴量を抽出`);
    }
  }

  // JSONL形式で出力
  const lines = allFeatures.map((f) => JSON.stringify(f)).join("\n");
  writeFileSync(FEATURES_FILE, lines, "utf8");

  console.log(`✅ 特徴量抽出完了: ${allFeatures.length}件`);
  console.log(`出力ファイル: ${FEATURES_FILE}`);

  if (allFeatures.length < 100) {
    console.warn(`⚠️  特徴量が100件未満です (${allFeatures.length}件)。クラスタリング時はCLUSTERSを3に縮小してください。`);
  }
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});

