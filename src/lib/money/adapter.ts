import type { Currency, Money } from './types'

export const toMoney = (amount: number, currency: Currency): Money => ({ amount, currency })

export const assertUSD = (m: Money) => {
  if (m.currency !== 'USD') throw new Error('Money must be USD')
}


