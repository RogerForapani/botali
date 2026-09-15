export const PRICE_FRESHNESS_DAYS = 5
const PRICE_FRESHNESS_MS = PRICE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000

export function isPriceStale(updatedAt?: string, now = Date.now()) {
  if (!updatedAt) return false
  const timestamp = new Date(updatedAt).getTime()
  return Number.isFinite(timestamp) && now - timestamp > PRICE_FRESHNESS_MS
}
