import type { Station } from '../types'

const anpBrands: Record<string, string> = {
  'Raízen': 'Shell',
  Vibra: 'Petrobras',
}

export function stationDisplayBrand(station: Station): string {
  if (station.source !== 'ANP') return station.brand
  return anpBrands[station.brand] ?? station.brand
}

export function stationDisplayName(station: Station): string {
  if (station.source !== 'ANP') return station.name
  const brand = stationDisplayBrand(station)
  return brand === 'Independente' ? 'Posto independente' : `Posto ${brand}`
}
