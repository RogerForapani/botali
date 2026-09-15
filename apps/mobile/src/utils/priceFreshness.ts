export const PRICE_FRESHNESS_DAYS = 5
const PRICE_FRESHNESS_MS = PRICE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000

export function isPriceStale(updatedAt?: string, now = Date.now()) {
  if (!updatedAt) return false
  const timestamp = new Date(updatedAt).getTime()
  return !Number.isFinite(timestamp) || now - timestamp > PRICE_FRESHNESS_MS
}

export function refreshPriceFreshness<T extends { prices: Record<string, { updatedAt?: string; stale?: boolean } | undefined> }>(station: T, now = Date.now()): T {
  return {
    ...station,
    prices: Object.fromEntries(Object.entries(station.prices).map(([code, price]) => [
      code,
      price ? { ...price, stale: isPriceStale(price.updatedAt, now) } : price,
    ])),
  }
}
