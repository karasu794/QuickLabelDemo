const React = require('react')

function SSRSection(props) {
  const { forceLetterhead, forceSignature, userLetterheads = [], userSignatures = [], initialExporterName } = props

  const lh = forceLetterhead
    ? React.createElement('p', { className: 'text-sm', 'data-testid': 'lh-explainer' }, 'Phoenixのレターヘッドが適用されます（管理設定ON）')
    : React.createElement(
        'div',
        { 'data-testid': 'lh-section' },
        React.createElement('h4', { className: 'font-medium' }, 'レターヘッド')
      )

  const sg = forceSignature
    ? React.createElement('p', { className: 'text-sm', 'data-testid': 'sign-explainer' }, 'Phoenixの署名が適用されます（管理設定ON）')
    : React.createElement(
        'div',
        { 'data-testid': 'sign-section' },
        React.createElement('h4', { className: 'font-medium' }, '署名')
      )

  const hideExporterFields = forceLetterhead || forceSignature

  const exporterBlock = hideExporterFields
    ? React.createElement(
        'div',
        { 'data-testid': 'exporter-name' },
        React.createElement('h4', { className: 'font-medium' }, '輸出者名'),
        React.createElement('p', { className: 'text-sm' }, 'Phoenix Co., Ltd. Norio Yamaguchi')
      )
    : React.createElement(
        'div',
        null,
        React.createElement('h4', { className: 'font-medium' }, '輸出者名')
      )

  const shipperDifferent = hideExporterFields
    ? null
    : React.createElement('div', { 'data-testid': 'shipper-different-toggle' },
        React.createElement('input', { type: 'checkbox', 'aria-label': '販売者と荷送人が異なる' }),
        React.createElement('span', { className: 'text-sm' }, '販売者と荷送人が異なる')
      )

  return React.createElement(
    'section',
    { className: 'space-y-6', 'data-testid': 'invoice-form' },
    lh,
    sg,
    exporterBlock,
    shipperDifferent
  )
}

module.exports = SSRSection


