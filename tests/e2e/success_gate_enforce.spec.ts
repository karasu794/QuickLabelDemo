import { test, expect } from '@playwright/test'

// ENV: SUCCESS_GATE_ENFORCE=true で実行
// 事前に seed: pending と completed の shipment を用意
const pendingId = process.env.E2E_SHIPMENT_PENDING_ID!
const completedId = process.env.E2E_SHIPMENT_COMPLETED_ID!

test('success gate blocks when payment pending or label missing', async ({ page }) => {
  await page.goto(`/shipping/new/success?shipmentId=${pendingId}`)
  await page.waitForURL(/\/shipping\/new\/review\?reason=/)
  const url = page.url()
  expect(url).toMatch(/reason=(payment_not_completed|label_not_ready)/)
})

test('success page renders when payment completed and label ready', async ({ page }) => {
  await page.goto(`/shipping/new/success?shipmentId=${completedId}`)
  await expect(page.getByTestId('success-title')).toBeVisible()
  await expect(page.getByTestId('cta-print')).toBeEnabled()
})


