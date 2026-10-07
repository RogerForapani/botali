import { describe, expect, it } from 'vitest'
import { compareVehicleTrips, estimateVehicleTrip, isVehicle, migrateLegacyVehicle, parseConsumption, parseVehicleYear, type Vehicle } from './vehicle'
import type { Station } from '../types'

const vehicle: Vehicle = { type: 'car', brand: 'Fiat', model: 'Uno', year: 2020, fuels: [{ fuelCode: 'gasolina', consumptionKmL: 10 }, { fuelCode: 'etanol', consumptionKmL: 7 }] }
const station = (prices: Station['prices']): Station => ({ id: 'p1', name: 'Posto', brand: 'Outra', latitude: 0, longitude: 0.01, distanceKm: 0, rating: 0, hasElectricCharging: false, prices })

describe('perfil local do veículo', () => {
  it('aceita consumo com vírgula e rejeita valores inválidos', () => {
    expect(parseConsumption('12,5')).toBe(12.5)
    expect(parseConsumption('0')).toBeNull()
    expect(parseConsumption('abc')).toBeNull()
    expect(parseVehicleYear('', 2026)).toBeNull()
    expect(parseVehicleYear('2027', 2026)).toBe(2027)
    expect(parseVehicleYear('2030', 2026)).toBeUndefined()
  })

  it('valida registros salvos antes de usá-los', () => {
    expect(isVehicle(vehicle)).toBe(true)
    expect(isVehicle({ ...vehicle, fuels: [{ fuelCode: 'gasolina', consumptionKmL: 0 }] })).toBe(false)
    expect(isVehicle({ ...vehicle, fuels: [vehicle.fuels[0], vehicle.fuels[0]] })).toBe(false)
    expect(isVehicle({ ...vehicle, type: 'unknown' })).toBe(false)
  })

  it('migra o cadastro de um combustível sem perder o consumo', () => {
    expect(migrateLegacyVehicle({ type: 'car', brand: 'Fiat', model: 'Uno', year: 2020, fuelCode: 'gasolina', consumptionKmL: 10 })).toEqual({ ...vehicle, fuels: [vehicle.fuels[0]] })
  })

  it('calcula ida e volta desde a posição do motorista, não do centro do mapa', () => {
    const trip = estimateVehicleTrip(vehicle.fuels[0], { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }, 5)
    expect(trip?.roundTripKm).toBeCloseTo(2.224, 2)
    expect(trip?.liters).toBeCloseTo(0.2224, 3)
    expect(trip?.cost).toBeCloseTo(1.112, 2)
    expect(estimateVehicleTrip(vehicle.fuels[0], { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }, 0)).toBeNull()
  })

  it('compara custos por consumo próprio e destaca apenas o melhor preço recente', () => {
    const options = compareVehicleTrips(vehicle, { latitude: 0, longitude: 0 }, station({ gasolina: { value: 6, confidence: 80 }, etanol: { value: 3.5, confidence: 80 } }))
    expect(options[0].trip?.cost).toBeGreaterThan(options[1].trip!.cost)
    expect(options.map((option) => option.best)).toEqual([false, true])
    const stale = compareVehicleTrips(vehicle, { latitude: 0, longitude: 0 }, station({ gasolina: { value: 6, confidence: 80 }, etanol: { value: 3.5, confidence: 20, stale: true } }))
    expect(stale.map((option) => option.best)).toEqual([false, false])
    const missing = compareVehicleTrips(vehicle, null, station({ gasolina: { value: 6, confidence: 80 } }))
    expect(missing.map((option) => option.trip)).toEqual([null, null])
    expect(missing[1].price).toBeNull()
  })
})
