#!/usr/bin/env tsx
/**
 * 集約レポート生成
 * 
 * 最新の観測実行と分析結果を統合してサマリーレポートを生成
 */

import fs from "node:fs";
import path from "node:path";

const AR = path.join(process.cwd(), "artifacts", "rate_analysis");
const logs = path.join(process.cwd(), "artifacts", "rate_logs");

function latestRunDir(): string | null {
  if (!fs.existsSync(logs)) {
    return null;
  }
  
  const dirs = fs
    .readdirSync(logs)
    .map((d) => path.join(logs, d))
    .filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
  
  if (dirs.length === 0) {
    return null;
  }
  
  return dirs.sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
  )[0];
}

const latest = latestRunDir();
const features = path.join(AR, "features.jsonl");
const cluster = path.join(AR, "cluster_summary.json");
const clusterReport = path.join(AR, "cluster_report.md");
const report = path.join(AR, "_run_summary.md");
const coverage = path.join(AR, "mapping_coverage.md");

const parts: string[] = [];

parts.push("# Rate Analysis Run Summary\n");
parts.push(`生成日時: ${new Date().toISOString()}\n`);

parts.push("## 最新観測実行\n");
parts.push(`- ログディレクトリ: ${latest ?? "N/A"}\n`);

if (latest) {
  try {
    const files = fs.readdirSync(latest);
    const requestFiles = files.filter((f) => f.endsWith("_request.json"));
    const failedFile = path.join(latest, "failed_cases.json");
    const failedCount = fs.existsSync(failedFile)
      ? JSON.parse(fs.readFileSync(failedFile, "utf8")).length
      : 0;
    
    parts.push(`- リクエストファイル数: ${requestFiles.length}\n`);
    parts.push(`- 失敗ケース数: ${failedCount}\n`);
    parts.push(`- 成功率: ${requestFiles.length > 0 ? ((requestFiles.length - failedCount) / requestFiles.length * 100).toFixed(1) : 0}%\n`);
  } catch (error) {
    parts.push(`- エラー: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

parts.push("\n## 特徴量データ\n");
if (fs.existsSync(features)) {
  const lines = fs.readFileSync(features, "utf8").split("\n").filter(Boolean);
  parts.push(`- レコード数: ${lines.length}\n`);
  if (lines.length < 100) {
    parts.push(`- ⚠️  警告: レコード数が100未満です。クラスタリング時はCLUSTERSを3に縮小されます。\n`);
  }
} else {
  parts.push("- 特徴量ファイルが見つかりません。`pnpm -s rates:features` を実行してください。\n");
}

parts.push("\n## 誤差クラスタ分析\n");
if (fs.existsSync(cluster)) {
  try {
    const c = JSON.parse(fs.readFileSync(cluster, "utf8"));
    const topClusters = Array.isArray(c) ? c.slice(0, 3) : [c];
    
    parts.push("### 上位3クラスタ（誤差縮小優先度順）\n\n");
    
    for (let i = 0; i < topClusters.length; i++) {
      const cl = topClusters[i];
      parts.push(`#### クラスタ ${cl.clusterId}\n`);
      parts.push(`- **サイズ**: ${cl.size}件\n`);
      parts.push(`- **平均誤差**: ${cl.avgErrorMagnitude?.toFixed(2) ?? "N/A"}円 (${cl.avgErrorPct?.toFixed(2) ?? "N/A"}%)\n`);
      parts.push(`- **優先度スコア**: ${cl.priority?.toFixed(2) ?? "N/A"}\n`);
      parts.push(`- **主要な不一致種類**: ${cl.dominantMismatchKinds?.join(", ") || "なし"}\n\n`);
    }
  } catch (error) {
    parts.push(`- エラー: クラスタサマリーの解析に失敗しました。\n`);
  }
} else {
  parts.push("- クラスタサマリーファイルが見つかりません。`pnpm -s rates:cluster` を実行してください。\n");
}

if (fs.existsSync(clusterReport)) {
  parts.push("\n## 詳細クラスタレポート\n");
  parts.push("`cluster_report.md` を参照してください。\n");
}

parts.push("\n## マッピングカバレッジ\n");
if (fs.existsSync(coverage)) {
  const content = fs.readFileSync(coverage, "utf8");
  parts.push(content);
  parts.push("\n");
} else {
  parts.push("- カバレッジレポートが見つかりません。`pnpm -s test:rates` を実行してください。\n");
}

if (latest) {
  parts.push("\n## ランタイム安全性チェック\n");
  parts.push("以下のコマンドでShip系エンドポイントの呼び出し痕跡を確認してください:\n\n");
  parts.push("```bash\n");
  parts.push(`pnpm -s guards:runtime "${latest}"\n`);
  parts.push("```\n\n");
  parts.push("期待結果: `OK (files scanned=X, ship hits=0)`\n");
}

parts.push("\n## 次のアクション\n");
parts.push("1. 上位3クラスタの誤差原因を特定し、修正を実施\n");
parts.push("2. カバレッジテストの失敗ケースを分析し、マッピングロジックを改善\n");
parts.push("3. 修正後、再度 `pnpm -s rates:all` を実行して改善を確認\n");

fs.mkdirSync(AR, { recursive: true });
fs.writeFileSync(report, parts.join(""), "utf8");

console.log(`[report] ✅ 集約レポート生成完了: ${report}`);

