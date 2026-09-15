import { describe, expect, it } from 'vitest'
import { isPriceStale, PRICE_FRESHNESS_DAYS } from './priceFreshness'

describe('atualidade do preço', () => {
  const now = new Date('2026-09-15T12:00:00.000Z').getTime()

  it('mantém como recente durante cinco dias', () => {
    expect(PRICE_FRESHNESS_DAYS).toBe(5)
    expect(isPriceStale('2026-09-10T12:00:01.000Z', now)).toBe(false)
  })

  it('marca como desatualizado depois de cinco dias', () => {
    expect(isPriceStale('2026-09-10T11:59:59.000Z', now)).toBe(true)
  })
})
