#!/usr/bin/env bash
set -euo pipefail
# 環境変数やFeature Flagの有効化はVercel/SupabaseのCLI/APIに合わせてコマンドを追加してください。
echo "[INFO] Enabling canary flag FQL_HOTFIX_SUCCESS_PAGE=on for target tenant..."
# 例: vercel env pull / vercel env add / supabase secrets set ...
