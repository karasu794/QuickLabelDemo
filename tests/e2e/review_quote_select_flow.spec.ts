// deprecated (review quote UI removed in step5)
// TODO(step5): サービス別見積ページで再設計後に復活
// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBeTruthy: () => {}, toBe: (_: any) => {} }) }
test.skip('レビュー: 見積もり選択→サマリー表示→発行ボタン有効化', async ({ page }: any) => {})


