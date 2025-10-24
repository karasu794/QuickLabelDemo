export type InvoiceOptions = {
  generateCommercialInvoice: boolean
  attachExistingInvoicePdf?: string
  letterheadId?: string
  signatureId?: string
  declareCurrency: string
  incoterms?: string
  dutiesPayer?: 'Shipper' | 'Recipient' | 'Third-Party'
  printHSHTS: boolean
  printOriginCountry: boolean
}


