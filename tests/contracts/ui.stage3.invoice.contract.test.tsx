/* global jest */
import React from 'react'
import ReactDOMServer from 'react-dom/server'

describe('UI: LetterheadSignatureSection', () => {
  test('force true hides selectors and shows fixed exporter', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Comp = require('../../src/app/shipping/new/invoice/LetterheadSignatureSection.ssr.js')
    const html = ReactDOMServer.renderToString(
      React.createElement(Comp, {
        forceLetterhead: true,
        forceSignature: true,
        userLetterheads: [],
        userSignatures: [],
        initialExporterName: 'Phoenix Co., Ltd. Norio Yamaguchi',
      })
    )
    expect(html).toContain('Phoenixのレターヘッドが適用されます')
    expect(html).toContain('Phoenixの署名が適用されます')
    expect(html).toContain('Phoenix Co., Ltd. Norio Yamaguchi')
  })

  test('force false shows selectors and editable exporter field placeholder', () => {
    const Comp = require('../../src/app/shipping/new/invoice/LetterheadSignatureSection.ssr.js')
    const html = ReactDOMServer.renderToString(
      React.createElement(Comp, {
        forceLetterhead: false,
        forceSignature: false,
        userLetterheads: [],
        userSignatures: [],
      })
    )
    expect(html).toContain('レターヘッド')
    expect(html).toContain('署名')
    // regression: ensure required data-testids exist in SSR output
    expect(html).toContain('data-testid="invoice-form"')
    expect(html).toContain('data-testid="lh-section"')
    expect(html).toContain('data-testid="sign-section"')
    expect(html).toContain('data-testid="shipper-different-toggle"')
  })
})


