export function envMode(): "production" | "sandbox" {
  return process.env.FEDEX_ENV === "production" ? "production" : "sandbox";
}

export function exportCreds() {
  return {
    clientId:
      process.env.FEDEX_EXPORT_CLIENT_ID ?? process.env.FEDEX_EXPORT_API_KEY ?? "",
    clientSecret:
      process.env.FEDEX_EXPORT_CLIENT_SECRET ?? process.env.FEDEX_EXPORT_SECRET_KEY ?? "",
    accountNumber: process.env.FEDEX_EXPORT_ACCOUNT_NUMBER ?? "",
  };
}

export function importCreds() {
  return {
    clientId:
      process.env.FEDEX_IMPORT_CLIENT_ID ?? process.env.FEDEX_IMPORT_API_KEY ?? "",
    clientSecret:
      process.env.FEDEX_IMPORT_CLIENT_SECRET ?? process.env.FEDEX_IMPORT_SECRET_KEY ?? "",
    accountNumber: process.env.FEDEX_IMPORT_ACCOUNT_NUMBER ?? "",
  };
}

