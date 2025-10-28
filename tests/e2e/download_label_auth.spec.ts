import { test, expect, request } from '@playwright/test'

const ownerCookie = process.env.E2E_OWNER_COOKIE! // auth cookie string
const otherCookie = process.env.E2E_OTHER_COOKIE!
const ownerShipment = process.env.E2E_OWNER_SHIPMENT_ID!

test('401 when not logged in', async ({ request }) => {
  const res = await request.get(`/api/download-label?shipmentId=${ownerShipment}`)
  expect(res.status()).toBe(401)
})

test('403 when another user', async ({ request, context }) => {
  const ctx = await context.request.newContext({ extraHTTPHeaders: { Cookie: otherCookie } })
  const res = await ctx.get(`/api/download-label?shipmentId=${ownerShipment}`)
  expect(res.status()).toBe(403)
})

test('200 for owner + inline', async ({ context }) => {
  const ctx = await context.request.newContext({ extraHTTPHeaders: { Cookie: ownerCookie } })
  const res = await ctx.get(`/api/download-label?shipmentId=${ownerShipment}&action=inline`)
  expect(res.status()).toBe(200)
  const cd = res.headers()['content-disposition'] || ''
  expect(/inline|attachment/i.test(cd)).toBeTruthy()
})


