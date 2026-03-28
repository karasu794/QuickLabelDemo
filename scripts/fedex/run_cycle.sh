#!/bin/bash
# FedEx Rate観測・学習ループ実行スクリプト
#
# 用途: 複数のテストケースを順次実行し、自動レート観測→正規化→差分検出を行う
#
# 実行例:
#   bash scripts/fedex/run_cycle.sh
#   bash scripts/fedex/run_cycle.sh --cases C1 C2 C3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# デフォルトのテストケース
DEFAULT_CASES=("C1" "C2" "C3")
CASES=("${@:+${@:1}}")

if [ ${#CASES[@]} -eq 0 ]; then
  CASES=("${DEFAULT_CASES[@]}")
fi

echo "🚀 FedEx Rate観測ループ開始"
echo "   ケース: ${CASES[*]}"
echo ""

# 1. 各ケースに対してリクエスト実行
for CASE_ID in "${CASES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 ケース実行: $CASE_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if ! pnpm fedex:request --case-id "$CASE_ID"; then
    echo "⚠️  ケース $CASE_ID のリクエストに失敗しました。続行します..."
    continue
  fi
  
  # 少し待機（API制限対策）
  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 正規化処理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! pnpm fedex:norm --latest; then
  echo "⚠️  正規化に失敗しました"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 差分検出"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! pnpm fedex:reconcile; then
  echo "⚠️  差分検出に失敗しました"
  exit 1
fi

echo ""
echo "✅ ループ完了"
echo ""
echo "💡 次のステップ:"
echo "   - 差分が検出された場合: pnpm fedex:reconcile --apply"
echo "   - 再実行: bash scripts/fedex/run_cycle.sh"

