#!/usr/bin/env tsx
/**
 * レート誤差のクラスタリング
 * 
 * features.jsonl を読み込み、KMeansクラスタリングを実行して
 * 誤差パターンを特定
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { FeatureSchema, ClusterSummarySchema, type Feature, type ClusterSummary } from "./schema.js";

const OUT_DIR = join(process.cwd(), "artifacts", "rate_analysis");
const FEATURES_FILE = join(OUT_DIR, "features.jsonl");
const CLUSTER_REPORT_FILE = join(OUT_DIR, "cluster_report.md");
const CLUSTER_SUMMARY_FILE = join(OUT_DIR, "cluster_summary.json");

// 簡易KMeans実装
class SimpleKMeans {
  private k: number;
  private maxIterations: number;

  constructor(k: number, maxIterations = 100) {
    this.k = k;
    this.maxIterations = maxIterations;
  }

  // ユークリッド距離
  private distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  // ランダム初期化
  private initializeCentroids(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const indices = new Set<number>();
    
    while (indices.size < k && indices.size < data.length) {
      const idx = Math.floor(Math.random() * data.length);
      indices.add(idx);
    }

    for (const idx of indices) {
      centroids.push([...data[idx]]);
    }

    return centroids;
  }

  // クラスタ割り当て
  private assignClusters(data: number[][], centroids: number[][]): number[] {
    const assignments: number[] = [];
    for (const point of data) {
      let minDist = Infinity;
      let closest = 0;
      for (let i = 0; i < centroids.length; i++) {
        const dist = this.distance(point, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      assignments.push(closest);
    }
    return assignments;
  }

  // セントロイド更新
  private updateCentroids(data: number[][], assignments: number[], k: number): number[][] {
    const centroids: number[][] = [];
    const counts = new Array(k).fill(0);
    const sums = new Array(k).fill(null).map(() => new Array(data[0].length).fill(0));

    for (let i = 0; i < data.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      for (let j = 0; j < data[i].length; j++) {
        sums[cluster][j] += data[i][j];
      }
    }

    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        centroids.push(sums[i].map((s) => s / counts[i]));
      } else {
        // 空クラスタの場合はランダム再初期化
        centroids.push([...data[Math.floor(Math.random() * data.length)]]);
      }
    }

    return centroids;
  }

  fit(data: number[][]): number[] {
    if (data.length === 0) return [];
    if (data.length < this.k) {
      // データが少ない場合は1クラスタに
      return new Array(data.length).fill(0);
    }

    let centroids = this.initializeCentroids(data, this.k);
    let assignments: number[] = [];

    for (let iter = 0; iter < this.maxIterations; iter++) {
      const newAssignments = this.assignClusters(data, centroids);
      
      // 収束チェック
      if (assignments.length > 0 && 
          JSON.stringify(newAssignments) === JSON.stringify(assignments)) {
        break;
      }

      assignments = newAssignments;
      centroids = this.updateCentroids(data, assignments, this.k);
    }

    return assignments;
  }
}

// 特徴量を数値ベクトルに変換
function featureToVector(feature: Feature): number[] {
  // One-Hotエンコーディングと数値特徴量を結合
  const vector: number[] = [];

  // 数値特徴量（正規化）
  vector.push(feature.weightKg / 50); // 0-1に正規化（最大50kg想定）
  vector.push(feature.errorMagnitude / 10000); // 誤差を正規化
  vector.push(feature.errorPct / 100); // 誤差率を0-1に
  vector.push(feature.actualTotal / 100000); // 総額を正規化

  // ブール特徴量
  vector.push(feature.isResidential ? 1 : 0);
  vector.push(feature.hasDeliveryArea ? 1 : 0);
  vector.push(feature.hasFuel ? 1 : 0);
  vector.push(feature.hasDiscount ? 1 : 0);
  vector.push(feature.hasBase ? 1 : 0);
  vector.push(feature.hasPeak ? 1 : 0);
  vector.push(feature.hasOtherSurcharges ? 1 : 0);
  vector.push(feature.hasDimensions ? 1 : 0);

  // 国コード（簡易エンコーディング）
  const countries = ["JP", "US", "CA", "GB", "AU", "DE", "FR", "OTHER"];
  const originIdx = countries.indexOf(feature.originCountry) >= 0 
    ? countries.indexOf(feature.originCountry) 
    : countries.length - 1;
  const destIdx = countries.indexOf(feature.destCountry) >= 0 
    ? countries.indexOf(feature.destCountry) 
    : countries.length - 1;
  
  // One-Hotエンコーディング（簡易版: インデックスを数値化）
  vector.push(originIdx / countries.length);
  vector.push(destIdx / countries.length);

  // サービスタイプ（簡易エンコーディング）
  const services = ["INTERNATIONAL_PRIORITY", "INTERNATIONAL_ECONOMY", "OTHER"];
  const serviceIdx = services.some(s => feature.serviceType.includes(s))
    ? services.findIndex(s => feature.serviceType.includes(s))
    : services.length - 1;
  vector.push(serviceIdx / services.length);

  // 重量帯
  const weightBands = ["0-1", "1-5", "5-10", "10+"];
  const weightBandIdx = weightBands.indexOf(feature.weightBand);
  vector.push(weightBandIdx >= 0 ? weightBandIdx / weightBands.length : 0);

  return vector;
}

// クラスタサマリー生成
function generateClusterSummary(
  features: Feature[],
  assignments: number[],
  k: number
): ClusterSummary[] {
  const clusters: Map<number, Feature[]> = new Map();
  
  for (let i = 0; i < features.length; i++) {
    const clusterId = assignments[i];
    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, []);
    }
    clusters.get(clusterId)!.push(features[i]);
  }

  const summaries: ClusterSummary[] = [];

  for (let clusterId = 0; clusterId < k; clusterId++) {
    const clusterFeatures = clusters.get(clusterId) || [];
    
    if (clusterFeatures.length === 0) continue;

    // 平均誤差
    const avgErrorMagnitude = 
      clusterFeatures.reduce((sum, f) => sum + f.errorMagnitude, 0) / clusterFeatures.length;
    const avgErrorPct = 
      clusterFeatures.reduce((sum, f) => sum + f.errorPct, 0) / clusterFeatures.length;

    // 主要な不一致種類
    const mismatchCounts = new Map<string, number>();
    for (const f of clusterFeatures) {
      for (const kind of f.mismatchKinds) {
        mismatchCounts.set(kind, (mismatchCounts.get(kind) || 0) + 1);
      }
    }
    const dominantMismatchKinds = Array.from(mismatchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([kind]) => kind);

    // 代表特徴（中央値や最頻値）
    const representativeFeatures: Record<string, unknown> = {
      originCountry: clusterFeatures[0].originCountry,
      destCountry: clusterFeatures[0].destCountry,
      serviceType: clusterFeatures[0].serviceType,
      isResidential: clusterFeatures.filter(f => f.isResidential).length > clusterFeatures.length / 2,
      hasDeliveryArea: clusterFeatures.filter(f => f.hasDeliveryArea).length > clusterFeatures.length / 2,
      avgWeightKg: clusterFeatures.reduce((sum, f) => sum + f.weightKg, 0) / clusterFeatures.length,
    };

    // 優先度計算（誤差が大きいほど優先）
    const priority = avgErrorMagnitude * avgErrorPct * clusterFeatures.length;

    summaries.push({
      clusterId,
      size: clusterFeatures.length,
      avgErrorMagnitude,
      avgErrorPct,
      dominantMismatchKinds,
      representativeFeatures,
      priority,
    });
  }

  // 優先度順にソート
  summaries.sort((a, b) => b.priority - a.priority);

  return summaries;
}

// レポート生成
function generateReport(summaries: ClusterSummary[]): string {
  let report = "# レート誤差クラスタリングレポート\n\n";
  report += `生成日時: ${new Date().toISOString()}\n\n`;
  report += `総クラスタ数: ${summaries.length}\n\n`;

  report += "## 上位3クラスタ（誤差縮小優先度順）\n\n";

  for (let i = 0; i < Math.min(3, summaries.length); i++) {
    const s = summaries[i];
    report += `### クラスタ ${s.clusterId}\n\n`;
    report += `- **サイズ**: ${s.size}件\n`;
    report += `- **平均誤差**: ${s.avgErrorMagnitude.toFixed(2)}円 (${s.avgErrorPct.toFixed(2)}%)\n`;
    report += `- **優先度スコア**: ${s.priority.toFixed(2)}\n\n`;

    report += `**主要な不一致種類**:\n`;
    for (const kind of s.dominantMismatchKinds) {
      report += `- ${kind}\n`;
    }
    report += "\n";

    report += `**代表特徴**:\n`;
    report += `- 原産国: ${s.representativeFeatures.originCountry}\n`;
    report += `- 宛先国: ${s.representativeFeatures.destCountry}\n`;
    report += `- サービス: ${s.representativeFeatures.serviceType}\n`;
    report += `- 住宅配送: ${s.representativeFeatures.isResidential ? "はい" : "いいえ"}\n`;
    report += `- 配達地域外: ${s.representativeFeatures.hasDeliveryArea ? "はい" : "いいえ"}\n`;
    report += `- 平均重量: ${(s.representativeFeatures.avgWeightKg as number).toFixed(2)}kg\n\n`;

    report += `**推定原因**:\n`;
    if (s.dominantMismatchKinds.includes("fuel_mismatch")) {
      report += "- Fuel Surchargeの抽出・計算に誤りがある可能性\n";
    }
    if (s.dominantMismatchKinds.includes("delivery_area_mismatch")) {
      report += "- Delivery Area Surchargeの判定・金額に誤りがある可能性\n";
    }
    if (s.dominantMismatchKinds.includes("base_missing")) {
      report += "- Base Chargeの抽出に誤りがある可能性\n";
    }
    if (s.dominantMismatchKinds.includes("discount_mismatch")) {
      report += "- Discountの計算・符号に誤りがある可能性\n";
    }
    if (s.dominantMismatchKinds.length === 0) {
      report += "- その他のサーチャージまたは総額計算の誤り\n";
    }
    report += "\n";
  }

  return report;
}

async function main() {
  console.log("📊 クラスタリング開始...");

  // 特徴量ファイルを読み込み
  let features: Feature[] = [];
  try {
    const content = readFileSync(FEATURES_FILE, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    features = lines.map((line) => {
      const parsed = JSON.parse(line);
      const result = FeatureSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      } else {
        console.warn("特徴量パースエラー:", result.error);
        return null;
      }
    }).filter((f): f is Feature => f !== null);
  } catch (error) {
    console.error(`特徴量ファイルの読み込みエラー: ${FEATURES_FILE}`, error);
    process.exit(1);
  }

  if (features.length === 0) {
    console.error("特徴量が0件です。features_extractor.tsを先に実行してください。");
    process.exit(1);
  }

  console.log(`読み込んだ特徴量: ${features.length}件`);

  // クラスタ数を決定（データが少ない場合は縮小）
  let k = 6;
  if (features.length < 100) {
    k = 3;
    console.log(`特徴量が100件未満のため、クラスタ数を${k}に縮小します。`);
  }

  // 特徴量をベクトルに変換
  const vectors = features.map(featureToVector);

  // KMeansクラスタリング
  console.log(`KMeansクラスタリング実行中 (k=${k})...`);
  const kmeans = new SimpleKMeans(k);
  const assignments = kmeans.fit(vectors);

  // クラスタサマリー生成
  const summaries = generateClusterSummary(features, assignments, k);

  // レポート生成
  const report = generateReport(summaries);
  writeFileSync(CLUSTER_REPORT_FILE, report, "utf8");
  console.log(`✅ クラスタレポート生成: ${CLUSTER_REPORT_FILE}`);

  // サマリーJSON出力
  const summaryJson = JSON.stringify(summaries, null, 2);
  writeFileSync(CLUSTER_SUMMARY_FILE, summaryJson, "utf8");
  console.log(`✅ クラスタサマリー生成: ${CLUSTER_SUMMARY_FILE}`);

  console.log("\n📈 クラスタリング結果:");
  for (const s of summaries.slice(0, 3)) {
    console.log(
      `  クラスタ ${s.clusterId}: ${s.size}件, 平均誤差 ${s.avgErrorMagnitude.toFixed(2)}円 (${s.avgErrorPct.toFixed(2)}%)`
    );
  }
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});

