// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => f(); expect = (v?: any) => ({ toBe: (_: any) => {} }) }

const cp = require('child_process')

test('tsc noEmit passes (no dead imports / unused symbols)', async () => {
  try {
    cp.execSync('pnpm -s tsc --noEmit', { stdio: 'inherit' })
  } catch (e) {
    throw new Error('TypeScript check failed')
  }
  expect(true).toBe(true)
})


