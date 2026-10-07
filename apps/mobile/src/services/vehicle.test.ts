import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadVehicle, removeVehicle, saveVehicle } from './vehicle'
import type { Vehicle } from '../utils/vehicle'

const storage = new Map<string, string>()
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value) }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key) }),
  },
}))

const vehicle: Vehicle = { type: 'motorcycle', brand: 'Honda', model: 'CG', year: 2022, fuelCode: 'gasolina', consumptionKmL: 35 }

describe('armazenamento local do veículo', () => {
  beforeEach(() => storage.clear())

  it('separa contas no mesmo aparelho e permite remover os dados', async () => {
    await saveVehicle('pessoa-a', vehicle)
    expect(await loadVehicle('pessoa-a')).toEqual(vehicle)
    expect(await loadVehicle('pessoa-b')).toBeNull()
    await removeVehicle('pessoa-a')
    expect(await loadVehicle('pessoa-a')).toBeNull()
  })

  it('ignora dados locais danificados', async () => {
    storage.set('botali:vehicle:v1:pessoa-a', '{quebrado')
    expect(await loadVehicle('pessoa-a')).toBeNull()
    storage.set('botali:vehicle:v1:pessoa-a', JSON.stringify({ ...vehicle, consumptionKmL: -2 }))
    expect(await loadVehicle('pessoa-a')).toBeNull()
  })
})
