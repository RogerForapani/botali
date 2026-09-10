import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import { distanceKmBetween, filterStations, findBestPriceStationId } from './stationFilters'

const station = (overrides: Partial<Station>): Station => ({
  id: 'station', name: 'Posto', brand: 'Botali', latitude: 0, longitude: 0, distanceKm: 2, rating: 0,
  hasElectricCharging: false, fuelCodes: ['gasolina'], serviceCodes: [], prices: { gasolina: { value: 6, confidence: 80 } }, ...overrides,
})

describe('filtros de postos', () => {
  it('combina combustível, raio e todos os serviços selecionados', () => {
    const rows = [
      station({ id: 'match', serviceCodes: ['conveniencia', 'calibragem'] }),
      station({ id: 'far', distanceKm: 20, serviceCodes: ['conveniencia', 'calibragem'] }),
      station({ id: 'missing-service', serviceCodes: ['conveniencia'] }),
    ]
    expect(filterStations(rows, { mode: 'gasolina', radiusKm: 10, serviceCodes: ['conveniencia', 'calibragem'] }).map((item) => item.id)).toEqual(['match'])
  })

  it('mostra somente recarga no modo elétrico', () => {
    const rows = [station({ id: 'fuel' }), station({ id: 'electric', hasElectricCharging: true })]
    expect(filterStations(rows, { mode: 'electric', radiusKm: 10, serviceCodes: [] }).map((item) => item.id)).toEqual(['electric'])
  })

  it('encontra o menor preço disponível', () => {
    const rows = [station({ id: 'a', prices: { gasolina: { value: 6.2, confidence: 70 } } }), station({ id: 'b', prices: { gasolina: { value: 5.9, confidence: 60 } } })]
    expect(findBestPriceStationId(rows, 'gasolina')).toBe('b')
    expect(findBestPriceStationId(rows, 'electric')).toBeNull()
  })

  it('recalcula a distância de dados salvos para a região atual', () => {
    expect(distanceKmBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.2, 1)
  })
})
