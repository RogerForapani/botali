import { describe, expect, it } from 'vitest'
import { estimateVehicleTrip, isVehicle, parseConsumption, parseVehicleYear, type Vehicle } from './vehicle'

const vehicle: Vehicle = { type: 'car', brand: 'Fiat', model: 'Uno', year: 2020, fuelCode: 'gasolina', consumptionKmL: 10 }

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
    expect(isVehicle({ ...vehicle, consumptionKmL: 0 })).toBe(false)
    expect(isVehicle({ ...vehicle, type: 'unknown' })).toBe(false)
  })

  it('calcula ida e volta desde a posição do motorista, não do centro do mapa', () => {
    const trip = estimateVehicleTrip(vehicle, { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }, 5)
    expect(trip?.roundTripKm).toBeCloseTo(2.224, 2)
    expect(trip?.liters).toBeCloseTo(0.2224, 3)
    expect(trip?.cost).toBeCloseTo(1.112, 2)
    expect(estimateVehicleTrip(vehicle, { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }, 0)).toBeNull()
  })
})
