// deprecated (review quote UI removed in step5)
// TODO(step5): サービス別見積ページで再設計後に復活
// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => {}; expect = () => ({ toBe: (_: any) => {}, toBeTruthy: () => {} }) }
test.skip('未選択時は発行ボタンが常にdisabled', async ({ page }: any) => {})


