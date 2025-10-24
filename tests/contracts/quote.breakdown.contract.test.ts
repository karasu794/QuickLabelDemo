import { extractResidentialSurchargeFromRateDetail, extractInsuredValueFromRateDetail } from '@/lib/quote/breakdown'

const makeDetail = (surcharges: any[]) => ({
  ratedShipmentDetails: [{
    shipmentRateDetails: [{ surcharges }]
  }]
})

describe('quote breakdown extractors', () => {
  test('residential合算', () => {
    const detail = makeDetail([
      { type: 'RESIDENTIAL_DELIVERY', amount: 120 },
      { name: 'Residential', amount: '30' },
      { name: 'FUEL', amount: 10 },
    ])
    expect(extractResidentialSurchargeFromRateDetail(detail)).toBe(150)
  })

  test('insured/declared 抽出', () => {
    const detail = makeDetail([
      { name: 'Declared Value', amount: 200 },
      { description: 'INSURED_VALUE_SURCHARGE', amount: '50' },
    ])
    expect(extractInsuredValueFromRateDetail(detail)).toBe(250)
  })
})


