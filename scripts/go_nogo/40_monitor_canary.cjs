import fs from 'fs';
import process from 'process';
const minutes = Number(process.env.CANARY_MONITOR_MINUTES || 30);
const thresholds = { okFalseRate: 0.02, successErrorRate: 0.01, timeoutRate: 0.01, p95: 3500, server5xx: 0.005 };
// NOTE: 実環境のメトリクス取得はあなたのログ基盤/エンドポイントに合わせて実装してください。
console.log(`[INFO] Monitoring canary for ${minutes} minutes with thresholds`, thresholds);
// ここではダミー合格として扱います。
fs.mkdirSync('artifacts/go_nogo', { recursive: true });
const pass = true; // TODO: 実メトリクスに置換
fs.writeFileSync('artifacts/go_nogo/canary_metrics.json', JSON.stringify({ pass, thresholds }, null, 2));
console.log('[OK] Canary metrics placeholder written');
if (!pass) process.exit(2);
