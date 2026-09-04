import type { Station } from '../types'

export const FLEX_REFERENCE_PERCENT = 70

export function getEthanolGasolineRatio(station: Station) {
  const ethanol = station.prices.etanol?.value
  const gasoline = station.prices.gasolina?.value

  if (!ethanol || !gasoline) return null

  const percentage = Math.round((ethanol / gasoline) * 100)
  return {
    percentage,
    favorable: percentage <= FLEX_REFERENCE_PERCENT,
  }
}
