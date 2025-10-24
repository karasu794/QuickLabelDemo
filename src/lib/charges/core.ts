// 探索ログ: 新規作成（WAVE1 charges-core）。唯一の真実として金額内訳の計算を集約する。

export type ChargeLine = {
  key: 'freight' | 'thirdPartyFee' | 'cardProcessingFee' | 'residentialSurcharge' | 'insuredValueSurcharge'
  label: string
  amount: number
}

export type ComputeChargesInput = {
  freightJPY: number
  isPhoenix: boolean
  serviceFeeRate: number // 例: 0.025
  processingFeeRate: number // 例: 0.0325
  taxRate: number // 例: 0.1
  residentialJPY?: number
  insuredValueJPY?: number
}

export type ComputeChargesOutput = {
  charges: ChargeLine[]
  subtotal: number // 運賃（非課税）
  tax: number // 課税対象は手数料/サーチャージの合算
  total: number // subtotal + taxable + tax
  fees: {
    serviceFee: number
    processingFee: number
    residential?: number
    insured?: number
  }
}

function toJPY(n: number): number {
  if (!Number.isFinite(n)) return 0
  // 仕様: 基本は整数JPYのみ扱う（小数は切り捨て）
  return Math.floor(n)
}

/**
 * 指定仕様に基づき、内訳と合計を計算する。
 * - 小計(subtotal)は純粋な運賃（非課税）
 * - 手数料・サーチャージは独立行に計上
 * - 税は(手数料・サーチャージの合算)のみに課税
 */
export function computeCharges(input: ComputeChargesInput): ComputeChargesOutput {
  const freight = Math.max(0, toJPY(input.freightJPY || 0))
  const serviceFeeRate = input.isPhoenix ? input.serviceFeeRate : 0
  const processingFeeRate = input.processingFeeRate

  const serviceFee = toJPY(freight * serviceFeeRate)
  const processingFee = toJPY(freight * processingFeeRate)
  const residential = toJPY(input.residentialJPY || 0)
  const insured = toJPY(input.insuredValueJPY || 0)

  const taxableBase = Math.max(0, serviceFee + processingFee + residential + insured)
  const tax = toJPY(taxableBase * input.taxRate)
  const subtotal = freight
  const total = subtotal + taxableBase + tax

  const charges: ChargeLine[] = [
    { key: 'freight', label: '国際送料（消費税適応外）', amount: subtotal },
  ]
  if (serviceFee > 0) charges.push({ key: 'thirdPartyFee', label: '第三者請求利用料（2.5%）', amount: serviceFee })
  if (processingFee > 0) charges.push({ key: 'cardProcessingFee', label: '事務手数料（クレジットカード）', amount: processingFee })
  if (residential > 0) charges.push({ key: 'residentialSurcharge', label: 'Residential サーチャージ', amount: residential })
  if (insured > 0) charges.push({ key: 'insuredValueSurcharge', label: '保険金額（INSURED VALUE）', amount: insured })

  return {
    charges,
    subtotal,
    tax,
    total,
    fees: {
      serviceFee,
      processingFee,
      residential: residential || undefined,
      insured: insured || undefined,
    },
  }
}

/**
 * 合計金額(totalAmount)から運賃(freight)を逆算する補助。
 * total = F + (sf+pf+res+ins) + tax((sf+pf+res+ins))
 * ただし sf/pf は F に比例、res/ins は外生。
 * 今回は res/ins を0と仮定した近似逆算式:
 *   total = F * (1 + (sfRate+pfRate) * (1 + taxRate))
 */
export function estimateFreightFromTotal(totalAmountJPY: number, opts: { serviceFeeRate: number; processingFeeRate: number; taxRate: number; isPhoenix: boolean }): number {
  const sr = opts.isPhoenix ? opts.serviceFeeRate : 0
  const pr = opts.processingFeeRate
  const factor = 1 + (sr + pr) * (1 + opts.taxRate)
  if (factor <= 0) return 0
  return Math.max(0, Math.floor((totalAmountJPY || 0) / factor))
}


