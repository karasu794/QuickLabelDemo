export function assertPdfLibInProd() {
  if (process.env.NODE_ENV === 'production' && !process.env.USE_PDF_LIB) {
    throw new Error('pdf-lib is mandatory in production')
  }
}


