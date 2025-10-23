// deprecated (review quote UI removed in step5)
// TODO(step5): サービス別見積ページで再設計後に復活
// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBeTruthy: () => {}, toBeGreaterThan: (_: any) => {} }) }
test.skip('レビュー画面で quote が price より前に描画される', async ({ page }: any) => {})


