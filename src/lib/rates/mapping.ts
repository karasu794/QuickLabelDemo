// src/lib/rates/mapping.ts

export type ChargeKey = "base"|"fuel"|"peak"|"delivery_area"|"discount"|"other"|"total";



export const fedexChargeMap: Record<string, ChargeKey> = {

  "base": "base",

  "subtotal": "base",

  "fuel": "fuel",

  "peak": "peak",

  "delivery area": "delivery_area",

  "delivery_area": "delivery_area",

  "配達地域外": "delivery_area",

  "discount": "discount",

  "割引": "discount",

  "total": "total",

  "合計": "total",

};



// 受け取った charge ラベル（文字列）を正規化キーへ

export function normalizeKey(label: string): ChargeKey {

  const k = label.toLowerCase().replace(/[\s\-]+/g, " ").trim();

  for (const key of Object.keys(fedexChargeMap)) {

    if (k.includes(key.toLowerCase())) return fedexChargeMap[key];

  }

  return "other";

}

