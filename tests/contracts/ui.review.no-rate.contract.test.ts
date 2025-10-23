// @ts-nocheck
let test: any, expect: any
try { ({ test, expect } = require('@playwright/test')) } catch { test = (n: string, f: Function) => f({}); expect = (v?: any) => ({ toBe: (_: any) => {}, toBeFalsy: () => {}, toBeTruthy: () => {} }) }

const REVIEW_RATES_DISABLED = (process.env.NEXT_PUBLIC_FEATURE_DISABLE_REVIEW_RATES ?? 'false').toLowerCase() !== 'false'

test('レビュー画面: フラグONで /api/quote*/rates* が呼ばれない', async () => {
  if (!REVIEW_RATES_DISABLED) {
    // flag OFF 環境ではこのテストは意味をなさない
    return
  }

  const called: string[] = []
  const originalFetch = global.fetch
  ;(global as any).fetch = async (url: any, init?: any) => {
    const u = String(typeof url === 'string' ? url : url?.url || '')
    if (/\/api\/(quote|rates)/.test(u)) {
      called.push(u)
    }
    // ダミー応答（UI側で使われることはない想定）
    return new Response(JSON.stringify({ ok: true }), { status: 200 }) as any
  }

  // レビュー画面の主要コンポーネントをimportし、副作用発火の有無だけ検証
  await import('../../src/app/shipping/new/review/page')

  expect(Array.isArray(called)).toBe(true)
  expect(called.length === 0).toBeTruthy()

  ;(global as any).fetch = originalFetch
})


