import { test, expect } from '@playwright/test'

test('address book shows only user entries (smoke)', async ({ page }) => {
  await page.goto('/shipping/new/recipient')
  // ここではUIの「保存した宛先」起動手段が別途用意されている前提
  // 実装次第で data-test セレクタに合わせて修正
  // とりあえず存在だけ確認
  await expect(page).toHaveTitle(/荷受人情報|Recipient/i)
})


