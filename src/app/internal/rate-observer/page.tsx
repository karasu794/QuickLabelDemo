import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { safeLog } from "@/lib/logging/safeLog";

// 認証ガード（内部のみ）
function isInternalAccess(): boolean {
  // 環境変数で制御可能
  return process.env.INTERNAL_DASHBOARD_ENABLED === "true" || process.env.NODE_ENV !== "production";
}

interface RunSummary {
  runId: string;
  timestamp: string;
  caseCount: number;
  failedCount: number;
}

interface ClusterSummary {
  clusterId: number;
  size: number;
  avgErrorMagnitude: number;
  avgErrorPct: number;
  dominantMismatchKinds: string[];
}

async function getLatestRuns(): Promise<RunSummary[]> {
  const logDir = join(process.cwd(), "artifacts", "rate_logs");
  const runs: RunSummary[] = [];

  try {
    if (!statSync(logDir, { throwIfNoEntry: false })?.isDirectory()) {
      return runs;
    }

    const entries = readdirSync(logDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const runDir = join(logDir, entry.name);
        const files = readdirSync(runDir);
        const requestFiles = files.filter((f) => f.endsWith("_request.json"));
        const failedFile = join(runDir, "failed_cases.json");
        const failedCount = statSync(failedFile, { throwIfNoEntry: false })
          ? JSON.parse(readFileSync(failedFile, "utf8")).length
          : 0;

        runs.push({
          runId: entry.name,
          timestamp: entry.name,
          caseCount: requestFiles.length,
          failedCount,
        });
      }
    }

    // タイムスタンプ順にソート（新しい順）
    runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error("ログ読み込みエラー:", error);
  }

  return runs.slice(0, 10); // 最新10件
}

async function getClusterSummary(): Promise<ClusterSummary[] | null> {
  const summaryFile = join(process.cwd(), "artifacts", "rate_analysis", "cluster_summary.json");
  
  try {
    if (statSync(summaryFile, { throwIfNoEntry: false })?.isFile()) {
      const content = readFileSync(summaryFile, "utf8");
      return JSON.parse(content) as ClusterSummary[];
    }
  } catch (error) {
    console.error("クラスタサマリー読み込みエラー:", error);
  }

  return null;
}

export default async function RateObserverPage() {
  if (!isInternalAccess()) {
    redirect("/");
  }

  const runs = await getLatestRuns();
  const clusters = await getClusterSummary();

  return (
    <div className="container mx-auto p-8" data-testid="rate-observer-dashboard">
      <h1 className="text-3xl font-bold mb-6">Rate Observer Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">最新の観測実行</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">実行ID</th>
                <th className="border border-gray-300 px-4 py-2">タイムスタンプ</th>
                <th className="border border-gray-300 px-4 py-2">ケース数</th>
                <th className="border border-gray-300 px-4 py-2">失敗数</th>
                <th className="border border-gray-300 px-4 py-2">成功率</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                    観測データがありません
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const successRate = run.caseCount > 0
                    ? ((run.caseCount - run.failedCount) / run.caseCount * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={run.runId} data-testid={`run-${run.runId}`}>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                        {safeLog(run.runId)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{run.timestamp}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{run.caseCount}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-red-600">
                        {run.failedCount}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {successRate}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {clusters && clusters.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">誤差クラスタ分析（上位3クラスタ）</h2>
          <div className="space-y-4">
            {clusters.slice(0, 3).map((cluster) => (
              <div
                key={cluster.clusterId}
                className="border border-gray-300 p-4 rounded"
                data-testid={`cluster-${cluster.clusterId}`}
              >
                <h3 className="text-lg font-semibold mb-2">クラスタ {cluster.clusterId}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">サイズ:</span> {cluster.size}件
                  </div>
                  <div>
                    <span className="font-semibold">平均誤差:</span>{" "}
                    {cluster.avgErrorMagnitude.toFixed(2)}円 ({cluster.avgErrorPct.toFixed(2)}%)
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">主要な不一致種類:</span>{" "}
                    {cluster.dominantMismatchKinds.join(", ") || "なし"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-4">クイックアクション</h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            - 観測実行: <code className="bg-gray-100 px-2 py-1 rounded">pnpm -s rates:observe</code>
          </p>
          <p className="text-sm text-gray-600">
            - 特徴量抽出: <code className="bg-gray-100 px-2 py-1 rounded">pnpm -s rates:features</code>
          </p>
          <p className="text-sm text-gray-600">
            - クラスタリング: <code className="bg-gray-100 px-2 py-1 rounded">pnpm -s rates:cluster</code>
          </p>
          <p className="text-sm text-gray-600">
            - 分析実行: <code className="bg-gray-100 px-2 py-1 rounded">pnpm -s rates:analyze</code>
          </p>
        </div>
      </section>
    </div>
  );
}

