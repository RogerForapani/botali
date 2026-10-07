import type { MapCenter } from '../services/stations'
import { distanceKmBetween } from './stationFilters'

export const vehicleTypes = [
  { code: 'car', label: 'Carro' },
  { code: 'motorcycle', label: 'Moto' },
  { code: 'truck', label: 'Caminhão' },
  { code: 'van', label: 'Van / utilitário' },
  { code: 'other', label: 'Outro' },
] as const

export type VehicleType = typeof vehicleTypes[number]['code']
export type Vehicle = {
  type: VehicleType
  brand: string
  model: string
  year: number | null
  fuelCode: string
  consumptionKmL: number
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
    && typeof vehicle.fuelCode === 'string' && vehicle.fuelCode.length > 0 && vehicle.fuelCode.length <= 40
    && typeof vehicle.consumptionKmL === 'number' && Number.isFinite(vehicle.consumptionKmL)
    && vehicle.consumptionKmL >= 0.5 && vehicle.consumptionKmL <= 100
}

export function estimateVehicleTrip(vehicle: Vehicle, from: MapCenter, to: MapCenter, fuelPrice: number) {
  if (!Number.isFinite(fuelPrice) || fuelPrice <= 0) return null
  const oneWayKm = distanceKmBetween(from, to)
  if (!Number.isFinite(oneWayKm)) return null
  const roundTripKm = oneWayKm * 2
  return { roundTripKm, liters: roundTripKm / vehicle.consumptionKmL, cost: roundTripKm / vehicle.consumptionKmL * fuelPrice }
}
