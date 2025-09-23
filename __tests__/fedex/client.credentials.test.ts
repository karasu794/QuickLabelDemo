import { selectFedExCredentials } from '@/lib/fedex/client'

describe('selectFedExCredentials', () => {
  const OLD = process.env
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD,
      FEDEX_EXPORT_ACCOUNT_NUMBER: 'EXP-ACC-001',
      FEDEX_EXPORT_API_KEY: 'EXP-ID',
      FEDEX_EXPORT_SECRET_KEY: 'EXP-SECRET',
      FEDEX_IMPORT_ACCOUNT_NUMBER: 'IMP-ACC-001',
      FEDEX_IMPORT_API_KEY: 'IMP-ID',
      FEDEX_IMPORT_SECRET_KEY: 'IMP-SECRET',
    }
  })
  afterAll(() => { process.env = OLD })

  test('JP -> US => export', () => {
    const c = selectFedExCredentials({ originCountry: 'JP', destinationCountry: 'US' })
    expect(c.kind).toBe('export')
    expect(c.accountNumber).toBe('EXP-ACC-001')
  })

  test('US -> JP => import', () => {
    const c = selectFedExCredentials({ originCountry: 'US', destinationCountry: 'JP' })
    expect(c.kind).toBe('import')
    expect(c.accountNumber).toBe('IMP-ACC-001')
  })

  test('JP -> JP (domestic) => import (default)', () => {
    const c = selectFedExCredentials({ originCountry: 'JP', destinationCountry: 'JP' })
    expect(c.kind).toBe('import')
    expect(c.accountNumber).toBe('IMP-ACC-001')
  })

  test('US -> US (domestic) => import', () => {
    const c = selectFedExCredentials({ originCountry: 'US', destinationCountry: 'US' })
    expect(c.kind).toBe('import')
  })

  test('EU -> JP => import', () => {
    const c = selectFedExCredentials({ originCountry: 'DE', destinationCountry: 'JP' })
    expect(c.kind).toBe('import')
  })

  test('JP -> EU => export', () => {
    const c = selectFedExCredentials({ originCountry: 'JP', destinationCountry: 'FR' })
    expect(c.kind).toBe('export')
  })
})


