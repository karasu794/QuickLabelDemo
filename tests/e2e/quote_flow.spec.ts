import { test, expect } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test.skip('見積フロー: declaredValue>0 で未チェックでもレート表示', async ({ page }) => {
  await page.goto(BASE_URL)

  // 必要最低限の入力
  await page.selectOption('select[name="originCountry"]', 'JP')
  await page.fill('input[name="originPostalCode"]', '1000001')
  await page.fill('input[name="originCityName"]', 'Chiyoda')

  await page.selectOption('select[name="destinationCountry"]', 'US')
  await page.fill('input[name="destinationPostalCode"]', '90001')
  await page.fill('input[name="destinationCityName"]', 'Los Angeles')

  await page.fill('input[name="package-0-weight"]', '1')
  await page.fill('input[name="package-0-declaredValue"]', '1000')

  // 追加保険のチェックは明示的に外しておく（UIがあれば）
  const higherInsurance = page.locator('input[name="higherInsurance"]')
  if (await higherInsurance.count()) {
    const checked = await higherInsurance.isChecked()
    if (checked) await higherInsurance.uncheck()
  }

  // 見積実行
  const submitBtn = page.getByRole('button', { name: /見積/i })
  await submitBtn.click()

  // 結果が表示されること
  await expect(page.locator('[data-test="quote-results"]')).toBeVisible({ timeout: 30000 })
})


