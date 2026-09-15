import { describe, expect, it } from 'vitest'
import { isPriceStale, PRICE_FRESHNESS_DAYS, refreshPriceFreshness } from './priceFreshness'

describe('atualidade do preço', () => {
  const now = new Date('2026-09-15T12:00:00.000Z').getTime()

  it('mantém como recente durante cinco dias', () => {
    expect(PRICE_FRESHNESS_DAYS).toBe(5)
    expect(isPriceStale('2026-09-10T12:00:01.000Z', now)).toBe(false)
  })

  it('marca como desatualizado depois de cinco dias', () => {
    expect(isPriceStale('2026-09-10T11:59:59.000Z', now)).toBe(true)
  })

  it('trata datas inválidas como desatualizadas', () => {
    expect(isPriceStale('data-inválida', now)).toBe(true)
  })

  it('recalcula preços de um snapshot ao carregar o cache', () => {
    const station = { id: 'posto-1', prices: { gasolina: { updatedAt: '2026-09-09T12:00:00.000Z', stale: false } } }
    expect(refreshPriceFreshness(station, now).prices.gasolina?.stale).toBe(true)
    expect(station.prices.gasolina.stale).toBe(false)
  })
})
