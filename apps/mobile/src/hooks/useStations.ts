import { useCallback, useEffect, useState } from 'react'
import { loadStations, type MapCenter } from '../services/stations'
import { loadStationSnapshot, saveStationSnapshot } from '../services/stationCache'
import type { Station } from '../types'
import { distanceKmBetween } from '../utils/stationFilters'

export function useStations(initialCenter: MapCenter, initialRadiusKm: number) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  const refresh = useCallback(async (center = initialCenter, radiusKm = initialRadiusKm) => {
    setLoading(true)
    setError(null)
    try {
      const rows = await loadStations(center, radiusKm)
      setStations(rows)
      setStale(false)
      setCachedAt(null)
      saveStationSnapshot(rows).catch(() => undefined)
      return rows
    } catch {
      const snapshot = await loadStationSnapshot()
      if (snapshot) {
        const cachedStations = snapshot.stations.map((station) => ({ ...station, distanceKm: distanceKmBetween(center, station) }))
        setStations(cachedStations)
        setStale(true)
        setCachedAt(snapshot.savedAt)
        setError('Sem conexão. Exibindo a última atualização salva neste aparelho.')
        return cachedStations
      }
      setError('Não foi possível carregar os postos. Verifique sua conexão e tente novamente.')
      setStale(false)
      return []
    } finally {
      setLoading(false)
    }
  }, [initialCenter, initialRadiusKm])

  useEffect(() => { refresh() }, [refresh])
  return { stations, loading, error, stale, cachedAt, refresh }
}
