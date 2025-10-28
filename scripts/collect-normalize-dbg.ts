/*
  一時的な収集スクリプト: normalizeFedExRate のデバッグ出力を得るために、
  代表的な3ケースのモックレスポンスで直接呼び出します。
*/
import { normalizeFedExRate } from '../src/lib/rates/normalizeFedExRate'

function money(amount: number, currency = 'JPY') {
  return { amount, currency }
}

type Case = { name: string; resp: any }

const cases: Case[] = [
  {
    name: 'disc≈base → netFreight=0, surcharges=0, other=total',
    resp: {
      baseCharge: 19319,
      discounts: 19319,
      ratedShipmentDetails: [
        {
          totalNetCharge: money(14861),
          shipmentRateDetails: [{ surcharges: [] }],
        },
      ],
    },
  },
  {
    name: 'Fuelのみ（一般例）',
    resp: {
      baseCharge: 10000,
      discounts: 1000,
      ratedShipmentDetails: [
        {
          totalNetCharge: money(9500),
          shipmentRateDetails: [
            {
              surcharges: [
                { type: 'FUEL', amount: money(500) },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Peakのみ（otherへの落ちなし）',
    resp: {
      baseCharge: 10000,
      discounts: 0,
      ratedShipmentDetails: [
        {
          totalNetCharge: money(10300),
          shipmentRateDetails: [
            {
              surcharges: [
                { type: 'PEAK', amount: money(300) },
              ],
            },
          ],
        },
      ],
    },
  },
]

async function main() {
  for (const c of cases) {
    console.log(`\n=== CASE: ${c.name} ===`)
    normalizeFedExRate(c.resp, 'JPY')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


