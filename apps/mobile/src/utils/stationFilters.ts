import type { MapMode, Station } from '../types'
import type { MapCenter } from '../services/stations'

export function distanceKmBetween(from: MapCenter, to: MapCenter) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function filterStations(stations: Station[], input: { mode: MapMode; radiusKm: number; serviceCodes: string[] }) {
  return stations.filter((station) => {
    const supportsMode = input.mode === 'electric' ? station.hasElectricCharging : station.fuelCodes?.includes(input.mode) || Boolean(station.prices[input.mode])
    const offersServices = input.serviceCodes.every((code) => station.serviceCodes?.includes(code))
    return station.distanceKm <= input.radiusKm && Boolean(supportsMode) && offersServices
  })
}

export function findBestPriceStationId(stations: Station[], mode: MapMode) {
  if (mode === 'electric') return null
  return stations.reduce<{ id: string; price: number } | null>((best, station) => {
    const price = station.prices[mode]?.value
    return price != null && (!best || price < best.price) ? { id: station.id, price } : best
  }, null)?.id ?? null
}
