import type { MapCenter } from '../services/stations'
import type { Station } from '../types'
import { distanceKmBetween } from './stationFilters'

export const vehicleTypes = [
  { code: 'car', label: 'Carro' },
  { code: 'motorcycle', label: 'Moto' },
  { code: 'truck', label: 'Caminhão' },
  { code: 'van', label: 'Van / utilitário' },
  { code: 'other', label: 'Outro' },
] as const

export type VehicleType = typeof vehicleTypes[number]['code']
export type VehicleFuel = { fuelCode: string; consumptionKmL: number }
export type Vehicle = {
  type: VehicleType
  brand: string
  model: string
  year: number | null
  fuels: VehicleFuel[]
}

export function parseConsumption(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  return amount >= 0.5 && amount <= 100 ? amount : null
}

export function parseVehicleYear(value: string, currentYear = new Date().getFullYear()): number | null | undefined {
  if (!value.trim()) return null
  if (!/^\d{4}$/.test(value.trim())) return undefined
  const year = Number(value.trim())
  return year >= 1900 && year <= currentYear + 1 ? year : undefined
}

export function isVehicle(value: unknown): value is Vehicle {
  if (!value || typeof value !== 'object') return false
  const vehicle = value as Partial<Vehicle>
  return vehicleTypes.some((item) => item.code === vehicle.type)
    && typeof vehicle.brand === 'string' && vehicle.brand.length <= 40
    && typeof vehicle.model === 'string' && vehicle.model.length <= 40
    && (vehicle.year === null || (Number.isInteger(vehicle.year) && Number(vehicle.year) >= 1900 && Number(vehicle.year) <= new Date().getFullYear() + 1))
    && Array.isArray(vehicle.fuels) && vehicle.fuels.length > 0 && vehicle.fuels.length <= 20
    && vehicle.fuels.every((fuel) => fuel && typeof fuel.fuelCode === 'string' && fuel.fuelCode.length > 0 && fuel.fuelCode.length <= 40
      && typeof fuel.consumptionKmL === 'number' && Number.isFinite(fuel.consumptionKmL)
      && fuel.consumptionKmL >= 0.5 && fuel.consumptionKmL <= 100)
    && new Set(vehicle.fuels.map((fuel) => fuel.fuelCode)).size === vehicle.fuels.length
}

export function migrateLegacyVehicle(value: unknown): Vehicle | null {
  if (!value || typeof value !== 'object') return null
  const legacy = value as Omit<Vehicle, 'fuels'> & VehicleFuel
  const migrated: Vehicle = { type: legacy.type, brand: legacy.brand, model: legacy.model, year: legacy.year, fuels: [{ fuelCode: legacy.fuelCode, consumptionKmL: legacy.consumptionKmL }] }
  return isVehicle(migrated) ? migrated : null
}

export function estimateVehicleTrip(fuel: VehicleFuel, from: MapCenter, to: MapCenter, fuelPrice: number) {
  if (!Number.isFinite(fuelPrice) || fuelPrice <= 0) return null
  const oneWayKm = distanceKmBetween(from, to)
  if (!Number.isFinite(oneWayKm)) return null
  const roundTripKm = oneWayKm * 2
  return { roundTripKm, liters: roundTripKm / fuel.consumptionKmL, cost: roundTripKm / fuel.consumptionKmL * fuelPrice }
}

export function compareVehicleTrips(vehicle: Vehicle, from: MapCenter | null, station: Station) {
  const options = vehicle.fuels.map((fuel) => {
    const price = station.prices[fuel.fuelCode]
    return { fuel, price: price ?? null, trip: from && price ? estimateVehicleTrip(fuel, from, station, price.value) : null }
  })
  const fresh = options.filter((option) => option.trip && !option.price?.stale)
  const bestCost = fresh.length > 1 ? Math.min(...fresh.map((option) => option.trip!.cost)) : null
  return options.map((option) => ({ ...option, best: bestCost !== null && option.trip !== null && !option.price?.stale && Math.abs(option.trip.cost - bestCost) < 0.005 }))
}
