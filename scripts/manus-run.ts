import fs from 'node:fs';
import { execSync } from 'node:child_process';


const taskFile = process.argv[2];
if (!taskFile) {
console.error('usage: ts-node scripts/manus-run.ts <task.yaml>');
process.exit(1);
}


function run(cmd: string) {
console.log(`$ ${cmd}`);
return execSync(cmd, { stdio: 'inherit' });
}


// 1) タスク読み込み（必要なら yaml 解析）
console.log(`Manus(local) start: ${taskFile}`);


// 2) 粗い分岐（本来はYAML stepsを解釈）
if (taskFile.includes('preflight')) {
run('npm run preflight');
// TODO: 失敗ログを解析して、Cursor用プロンプトを生成→ファイル出力
// TODO: PR本文を生成して `gh pr create` を呼ぶ
}


if (taskFile.includes('docs_sync')) {
// TODO: Docs差分検出→テンプレ適用→`gh pr create`
}


console.log('Done.');