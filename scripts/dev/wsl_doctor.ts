import { execSync } from 'node:child_process';
function run(cmd:string){ try{ return execSync(cmd,{stdio:['ignore','pipe','pipe']}).toString().trim(); }catch(e:any){ return (e.stdout?.toString()||e.message||'').trim(); }}
const platform = `${process.platform}-${process.arch}`;
const nodev = process.version;
const store = run('pnpm config get store-dir');
const hitsWin = run("fd -HI '@esbuild/win32-x64' node_modules .pnpm").split('\n').filter(Boolean);
const hitsLin = run("fd -HI '@esbuild/linux-x64' node_modules .pnpm").split('\n').filter(Boolean);
console.log('[WSL-DOCTOR] node', nodev, 'platform', platform);
console.log('[WSL-DOCTOR] pnpm store-dir:', store);
console.log('[WSL-DOCTOR] win32 esbuild artifacts:', hitsWin.length);
if (hitsWin.length) hitsWin.slice(0,10).forEach(p=>console.log('  -', p));
console.log('[WSL-DOCTOR] linux esbuild artifacts:', hitsLin.length);
if (String(store).startsWith('/mnt/')) console.log('[WARN] pnpm store is on /mnt. Use: pnpm config set store-dir ~/.pnpm-store');
console.log('[WSL-DOCTOR] done');

