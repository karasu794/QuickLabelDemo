export type FedexMode = "production" | "sandbox";

export const FEDX = {
  oauth: (env: FedexMode) =>
    env === "production"
      ? "https://apis.fedex.com/oauth/token"
      : "https://apis-sandbox.fedex.com/oauth/token",

  rate: (env: FedexMode) =>
    env === "production"
      ? "https://apis.fedex.com/rate/v1/rates/quotes"
      : "https://apis-sandbox.fedex.com/rate/v1/rates/quotes",
} as const;

// 物理的に禁止するパス
export const BANNED_PATHS = [
  "/ship/",
  "/openship/",
  "/ship/v1/shipments",
  "/ship/v1/openship",
] as const;

