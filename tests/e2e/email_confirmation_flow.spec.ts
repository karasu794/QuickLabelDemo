import { test, expect } from '@playwright/test'

test('成功ページで通知再送ボタンが200を返しトースト表示', async ({ page, context }) => {
  await context.addCookies([{ name: 'core-mode', value: 'mock', domain: 'localhost', path: '/' }])
  const params = new URLSearchParams({
    trackingNumber: '999999999999',
    paymentId: 'pay_mock',
    shipmentId: 'mock-ship-1',
    labelUrl: 'https://example.com/mock.pdf'
  })
  await page.goto(`/shipping/new/success?${params.toString()}`)

  await page.getByTestId('resend-mail').click()
  await expect(page.locator('text=再送しました')).toBeVisible()
})


