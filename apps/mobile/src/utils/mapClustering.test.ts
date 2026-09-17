import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import { clusterStations } from './mapClustering'

const station = (id: string, latitude: number, longitude: number): Station => ({ id, name: id, brand: 'Shell', latitude, longitude, distanceKm: 0, rating: 0, hasElectricCharging: false, prices: {} })
const region = { latitude: 0, longitude: 0, latitudeDelta: .08, longitudeDelta: .08 }

describe('agrupamento visual do mapa', () => {
  it('agrupa postos próximos e mantém os distantes separados', () => {
    const items = clusterStations([station('a', 0, 0), station('b', .001, .001), station('c', .03, .03)], region)
    expect(items).toHaveLength(2)
    expect(items.find((item) => item.kind === 'cluster' && item.stations.length === 2)).toBeTruthy()
  })

  it('mantém o posto selecionado fora do grupo', () => {
    const items = clusterStations([station('a', 0, 0), station('b', .001, .001)], region, 'a')
    expect(items).toHaveLength(2)
    expect(items.some((item) => item.kind === 'station' && item.station.id === 'a')).toBe(true)
  })

  it('separa postos à medida que o mapa aproxima', () => {
    const closeRegion = { ...region, latitudeDelta: .002, longitudeDelta: .002 }
    expect(clusterStations([station('a', 0, 0), station('b', .001, .001)], closeRegion)).toHaveLength(2)
  })
})
