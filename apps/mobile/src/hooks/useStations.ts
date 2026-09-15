import { useCallback, useEffect, useRef, useState } from 'react'
import { loadStations, type MapCenter } from '../services/stations'
import { loadStationSnapshot, saveStationSnapshot } from '../services/stationCache'
import { recordAppFailure } from '../services/diagnostics'
import type { Station } from '../types'
import { userMessageForError } from '../utils/appError'
import { distanceKmBetween } from '../utils/stationFilters'

export function useStations(initialCenter: MapCenter, initialRadiusKm: number) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const requestId = useRef(0)

  const refresh = useCallback(async (center = initialCenter, radiusKm = initialRadiusKm) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const rows = await loadStations(center, radiusKm)
      if (currentRequest !== requestId.current) return rows
      setStations(rows)
      setStale(false)
      setCachedAt(null)
      saveStationSnapshot(rows).catch(() => undefined)
      return rows
    } catch (loadError) {
      recordAppFailure('stations.load', loadError).catch(() => undefined)
      const snapshot = await loadStationSnapshot()
      if (currentRequest !== requestId.current) return []
      if (snapshot) {
        const cachedStations = snapshot.stations.map((station) => ({ ...station, distanceKm: distanceKmBetween(center, station) }))
        setStations(cachedStations)
        setStale(true)
        setCachedAt(snapshot.savedAt)
        setError(userMessageForError(loadError, 'Não foi possível atualizar os postos. Exibindo os dados salvos neste aparelho.'))
        return cachedStations
      }
      setStations([])
      setError(userMessageForError(loadError, 'Não foi possível carregar os postos. Tente novamente.'))
      setStale(false)
      return []
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [initialCenter, initialRadiusKm])

  useEffect(() => { refresh() }, [refresh])
  return { stations, loading, error, stale, cachedAt, refresh }
}
