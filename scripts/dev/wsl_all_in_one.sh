#!/usr/bin/env bash
set -euo pipefail
log(){ echo -e "[WSL-AIO] $*"; }

log "Step0: ensure package.json present"
[ -f package.json ] || { echo "Run in project root"; exit 1; }

log "Step1: install fd/ripgrep"
sudo apt update -y
sudo apt install -y fd-find ripgrep
sudo ln -sf "$(command -v fdfind)" /usr/local/bin/fd || true

log "Step2: pin pnpm store to ~/.pnpm-store"
pnpm config set store-dir ~/.pnpm-store

log "Step3: purge Windows-built artifacts"
rm -rf node_modules .pnpm || true

log "Step4: reinstall deps for Linux"
pnpm install --frozen-lockfile=false

log "Step5: rebuild esbuild for Linux"
pnpm rebuild esbuild || true

log "Step6: win32 esbuild residue check"
WINHITS=$(fd -HI "@esbuild/win32-x64" node_modules .pnpm 2>/dev/null | wc -l || true)
if [ "${WINHITS}" != "0" ]; then
  log "Detected ${WINHITS} win32 esbuild artifacts → force linux-x64"
  pnpm add -D @esbuild/linux-x64
  pnpm rebuild esbuild || true
fi

log "Step7: doctor"
pnpm -s wsl:doctor || true

log "Step8: env guard"
export FEDEX_SAFE_MODE=${FEDEX_SAFE_MODE:-rate-only}
export FEDEX_KILL_SWITCH=${FEDEX_KILL_SWITCH:-false}
export FEDEX_MAX_RPM=${FEDEX_MAX_RPM:-20}
if [ "$FEDEX_SAFE_MODE" != "rate-only" ] || [ "$FEDEX_KILL_SWITCH" = "true" ]; then
  echo "[WSL-AIO] Env not safe: FEDEX_SAFE_MODE=$FEDEX_SAFE_MODE FEDEX_KILL_SWITCH=$FEDEX_KILL_SWITCH"; exit 2;
fi

log "Step9: run rates:all:safe"
pnpm -s rates:all:safe

log "DONE"

