import { z } from "zod";

/**
 * 特徴量スキーマ（クラスタリング用）
 */
export const FeatureSchema = z.object({
  // 識別子
  caseId: z.string(),
  timestamp: z.string(),
  runId: z.string(),

  // 地理的特徴
  originCountry: z.string(),
  destCountry: z.string(),
  originPostalCode: z.string().optional(),
  destPostalCode: z.string().optional(),
  zone: z.string().optional(), // 郵便番号から推定

  // サービス
  serviceType: z.string(),

  // 重量・寸法
  weightKg: z.number(),
  weightBand: z.string(), // "0-1", "1-5", "5-10", "10+"
  hasDimensions: z.boolean(),
  dimsVolumeCm3: z.number().optional(),

  // フラグ
  isResidential: z.boolean(),
  hasDeliveryArea: z.boolean(),
  hasFuel: z.boolean(),
  hasDiscount: z.boolean(),
  hasBase: z.boolean(),
  hasPeak: z.boolean(),
  hasOtherSurcharges: z.boolean(),

  // 誤差情報
  errorMagnitude: z.number(), // 絶対誤差
  errorSign: z.number(), // -1: 過小, 0: 一致, 1: 過大
  errorPct: z.number(), // 誤差率 (%)
  expectedTotal: z.number().optional(), // FQL計算結果
  actualTotal: z.number(), // FedExレスポンス

  // 不一致種類
  mismatchKinds: z.array(z.string()), // ["fuel", "base", "delivery_area", "discount", ...]
});

export type Feature = z.infer<typeof FeatureSchema>;

/**
 * クラスタサマリースキーマ
 */
export const ClusterSummarySchema = z.object({
  clusterId: z.number(),
  size: z.number(),
  avgErrorMagnitude: z.number(),
  avgErrorPct: z.number(),
  dominantMismatchKinds: z.array(z.string()),
  representativeFeatures: z.record(z.unknown()),
  priority: z.number(), // 誤差縮小の優先度（高いほど優先）
});

export type ClusterSummary = z.infer<typeof ClusterSummarySchema>;

