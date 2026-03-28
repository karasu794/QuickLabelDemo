#!/usr/bin/env bash
set -euo pipefail
cat <<'MSG'
[WSL-MIGRATE]
推奨: /mnt/c 上ではなく、WSL ネイティブ FS (例: ~/work) で実行してください。

例:
  mkdir -p ~/work
  cd ~/work
  git clone <your-repo-url>
  cd QuickLabel
  pnpm config set store-dir ~/.pnpm-store
  pnpm install
  pnpm -s rates:all
MSG

