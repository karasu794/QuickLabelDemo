export async function waitForAnchor(page: any, testId: string) {
  const loc = page.locator(`[data-test="${testId}"]`)
  await loc.first().waitFor({ state: 'attached' })
  await page.locator(`[data-test="${testId}"] [aria-busy="true"]`).first().waitFor({ state: 'detached' }).catch(() => {})
}


