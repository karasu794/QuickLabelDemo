#!/usr/bin/env tsx
/**
 * マッピングカバレッジレポート生成
 * 
 * test:rates の実行結果からレポートを生成
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "artifacts", "rate_analysis");
const REPORT_FILE = join(OUT_DIR, "mapping_coverage.md");

// 簡易レポート生成（実際にはvitestの出力をパースする必要がある）
function generateReport(): string {
  let report = "# サーチャージ/割引マッピングカバレッジレポート\n\n";
  report += `生成日時: ${new Date().toISOString()}\n\n`;
  report += "## 概要\n\n";
  report += "このレポートは、FedEx Rate APIのレスポンスから各種サーチャージ・割引が\n";
  report += "正しく抽出・分類されているかを検証するテスト結果です。\n\n";
  report += "## テストケース\n\n";
  report += "各テストケースは `tests/fixtures/rates/cases/` 配下のJSONファイルで定義されています。\n\n";
  report += "## 実行方法\n\n";
  report += "```bash\n";
  report += "pnpm -s test:rates\n";
  report += "```\n\n";
  report += "## 検証項目\n\n";
  report += "- Base Chargeの抽出\n";
  report += "- Fuel Surchargeの抽出\n";
  report += "- Delivery Area Surchargeの抽出\n";
  report += "- Residential Surchargeの抽出\n";
  report += "- Discountの抽出と符号\n";
  report += "- その他のサーチャージの分類\n\n";
  report += "## 注意事項\n\n";
  report += "- テストケースは段階的に追加してください\n";
  report += "- 初回目標: 10件以上、pass率80%以上\n";
  report += "- 失敗したケースは原因を特定し、修正対象を明確化してください\n\n";

  return report;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const report = generateReport();
  writeFileSync(REPORT_FILE, report, "utf8");
  console.log(`✅ カバレッジレポート生成: ${REPORT_FILE}`);
  console.log("⚠️  実際のテスト結果は vitest の出力を確認してください。");
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});

