#!/usr/bin/env bash
set -euo pipefail
printf '\n[WSL-FIX] Start esbuild platform fix...\n'
# 1) プロジェクト直下チェック
if [ ! -f package.json ]; then
  echo '[WSL-FIX] Error: Run this in project root (package.json not found)'; exit 1; fi
# 2) pnpm store を WSL 側に固定
STORE_DIR=$(pnpm config get store-dir || true)
if [[ "$STORE_DIR" == /mnt/* ]]; then
  echo "[WSL-FIX] pnpm store is on Windows path: $STORE_DIR -> moving to ~/.pnpm-store"
  pnpm config set store-dir ~/.pnpm-store
fi
# 3) Windows で生成された依存を一掃
rm -rf node_modules .pnpm
# 4) 再インストール
pnpm install --frozen-lockfile=false
# 5) 念押しで esbuild を Linux 用に再ビルド
pnpm rebuild esbuild || true
# 6) win32/esbuild の混入チェック
HITS=$(fd -HI "@esbuild/win32-x64" node_modules .pnpm 2>/dev/null | wc -l || true)
if [ "${HITS}" != "0" ]; then
  echo "[WSL-FIX] Detected win32 esbuild artifacts (${HITS}). Trying explicit add..."
  pnpm add -D @esbuild/linux-x64
  pnpm rebuild esbuild
fi
# 7) 最終確認
node -e "console.log('[WSL-FIX] Node', process.version, 'platform', process.platform, 'arch', process.arch)"
fd -HI "@esbuild/win32-x64" node_modules .pnpm 2>/dev/null | sed 's/^/[WSL-FIX] win32-hit: /' || true
echo '[WSL-FIX] Done.'

