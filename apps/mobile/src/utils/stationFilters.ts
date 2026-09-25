import type { MapMode, Station } from '../types'
import type { MapBounds, MapCenter } from '../services/stations'

export function distanceKmBetween(from: MapCenter, to: MapCenter) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function mergeStationPages(current: Station[], incoming: Station[], center: MapCenter, radiusKm: number, maxItems = 600) {
  const unique = new Map(current.map((station) => [station.id, station]))
  for (const station of incoming) unique.set(station.id, station)
  return [...unique.values()]
    .map((station) => ({ ...station, distanceKm: distanceKmBetween(center, station) }))
    .filter((station) => station.distanceKm <= radiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, maxItems)
}

export function centerOfBounds(bounds: MapBounds): MapCenter {
  return { latitude: (bounds.north + bounds.south) / 2, longitude: (bounds.east + bounds.west) / 2 }
}

export function isStationInBounds(station: Station, bounds: MapBounds) {
  return station.latitude >= bounds.south && station.latitude <= bounds.north
    && station.longitude >= bounds.west && station.longitude <= bounds.east
}

export function mergeStationPagesInBounds(current: Station[], incoming: Station[], bounds: MapBounds, maxItems = 600) {
  const center = centerOfBounds(bounds)
  const unique = new Map(current.map((station) => [station.id, station]))
  for (const station of incoming) unique.set(station.id, station)
  return [...unique.values()]
    .filter((station) => isStationInBounds(station, bounds))
    .map((station) => ({ ...station, distanceKm: distanceKmBetween(center, station) }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, maxItems)
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
    const selectedPrice = station.prices[mode]
    const price = selectedPrice?.stale ? undefined : selectedPrice?.value
    return price != null && (!best || price < best.price) ? { id: station.id, price } : best
  }, null)?.id ?? null
}
