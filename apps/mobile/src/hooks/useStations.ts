import { useCallback, useEffect, useRef, useState } from 'react'
import { loadStations, loadStationsInBounds, type MapBounds, type MapCenter } from '../services/stations'
import { loadStationSnapshot, saveStationSnapshot } from '../services/stationCache'
import { recordAppFailure } from '../services/diagnostics'
import type { Station } from '../types'
import { userMessageForError } from '../utils/appError'
import { centerOfBounds, distanceKmBetween, isStationInBounds, mergeStationPages, mergeStationPagesInBounds } from '../utils/stationFilters'

const PAGE_SIZE = 200
const MAX_ACCUMULATED_STATIONS = 600

export function useStations(initialCenter: MapCenter, initialRadiusKm: number) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const requestId = useRef(0)
  const stationsRef = useRef<Station[]>([])
  const queryKeyRef = useRef('')
  const nextOffsetRef = useRef(0)

  const refresh = useCallback(async (center = initialCenter, radiusKm = initialRadiusKm) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const rows = await loadStations(center, radiusKm, 0, PAGE_SIZE)
      if (currentRequest !== requestId.current) return rows
      const next = mergeStationPages([], rows, center, radiusKm, MAX_ACCUMULATED_STATIONS)
      stationsRef.current = next
      setStations(next)
      queryKeyRef.current = queryKey(center, radiusKm)
      nextOffsetRef.current = rows.length
      setHasMore(rows.length === PAGE_SIZE)
      setStale(false)
      setCachedAt(null)
      saveStationSnapshot(next).catch(() => undefined)
      return rows
    } catch (loadError) {
      recordAppFailure('stations.load', loadError).catch(() => undefined)
      const snapshot = await loadStationSnapshot()
      if (currentRequest !== requestId.current) return []
      if (snapshot) {
        const cachedStations = snapshot.stations.map((station) => ({ ...station, distanceKm: distanceKmBetween(center, station) }))
        stationsRef.current = cachedStations
        setStations(cachedStations)
        setHasMore(false)
        setStale(true)
        setCachedAt(snapshot.savedAt)
        setError(userMessageForError(loadError, 'Não foi possível atualizar os postos. Exibindo os dados salvos neste aparelho.'))
        return cachedStations
      }
      setStations([])
      stationsRef.current = []
      setHasMore(false)
      setError(userMessageForError(loadError, 'Não foi possível carregar os postos. Tente novamente.'))
      setStale(false)
      return []
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [initialCenter, initialRadiusKm])

  const loadMore = useCallback(async (center: MapCenter, radiusKm: number) => {
    if (!hasMore) return stationsRef.current
    if (queryKeyRef.current !== queryKey(center, radiusKm)) return refresh(center, radiusKm)
    const currentRequest = ++requestId.current
    setLoading(true); setError(null)
    try {
      const rows = await loadStations(center, radiusKm, nextOffsetRef.current, PAGE_SIZE)
      if (currentRequest !== requestId.current) return stationsRef.current
      const next = mergeStationPages(stationsRef.current, rows, center, radiusKm, MAX_ACCUMULATED_STATIONS)
      stationsRef.current = next
      nextOffsetRef.current += rows.length
      setStations(next); setHasMore(rows.length === PAGE_SIZE); setStale(false); setCachedAt(null)
      saveStationSnapshot(next).catch(() => undefined)
      return next
    } catch (loadError) {
      recordAppFailure('stations.load-more', loadError).catch(() => undefined)
      if (currentRequest === requestId.current) setError(userMessageForError(loadError, 'Não foi possível carregar mais postos agora.'))
      return stationsRef.current
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [hasMore, refresh])

  const refreshBounds = useCallback(async (bounds: MapBounds) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const rows = await loadStationsInBounds(bounds, 0, PAGE_SIZE)
      if (currentRequest !== requestId.current) return rows
      const next = mergeStationPagesInBounds([], rows, bounds, MAX_ACCUMULATED_STATIONS)
      stationsRef.current = next
      setStations(next)
      queryKeyRef.current = boundsQueryKey(bounds)
      nextOffsetRef.current = rows.length
      setHasMore(rows.length === PAGE_SIZE)
      setStale(false)
      setCachedAt(null)
      saveStationSnapshot(next).catch(() => undefined)
      return rows
    } catch (loadError) {
      recordAppFailure('stations.load-bounds', loadError).catch(() => undefined)
      const snapshot = await loadStationSnapshot()
      if (currentRequest !== requestId.current) return []
      if (snapshot) {
        const center = centerOfBounds(bounds)
        const cachedStations = snapshot.stations
          .filter((station) => isStationInBounds(station, bounds))
          .map((station) => ({ ...station, distanceKm: distanceKmBetween(center, station) }))
        stationsRef.current = cachedStations
        setStations(cachedStations)
        setHasMore(false)
        setStale(true)
        setCachedAt(snapshot.savedAt)
        setError(userMessageForError(loadError, 'Não foi possível atualizar esta área. Exibindo os dados salvos neste aparelho.'))
        return cachedStations
      }
      stationsRef.current = []
      setStations([])
      setHasMore(false)
      setError(userMessageForError(loadError, 'Não foi possível carregar os postos desta área. Tente novamente.'))
      setStale(false)
      return []
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  const loadMoreBounds = useCallback(async (bounds: MapBounds) => {
    if (!hasMore) return stationsRef.current
    if (queryKeyRef.current !== boundsQueryKey(bounds)) return refreshBounds(bounds)
    const currentRequest = ++requestId.current
    setLoading(true); setError(null)
    try {
      const rows = await loadStationsInBounds(bounds, nextOffsetRef.current, PAGE_SIZE)
      if (currentRequest !== requestId.current) return stationsRef.current
      const next = mergeStationPagesInBounds(stationsRef.current, rows, bounds, MAX_ACCUMULATED_STATIONS)
      stationsRef.current = next
      nextOffsetRef.current += rows.length
      setStations(next); setHasMore(rows.length === PAGE_SIZE); setStale(false); setCachedAt(null)
      saveStationSnapshot(next).catch(() => undefined)
      return next
    } catch (loadError) {
      recordAppFailure('stations.load-more-bounds', loadError).catch(() => undefined)
      if (currentRequest === requestId.current) setError(userMessageForError(loadError, 'Não foi possível carregar mais postos desta área agora.'))
      return stationsRef.current
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [hasMore, refreshBounds])

  useEffect(() => { refresh() }, [refresh])
  return { stations, loading, error, stale, cachedAt, hasMore, refresh, loadMore, refreshBounds, loadMoreBounds }
}

function boundsQueryKey(bounds: MapBounds) {
  return `bounds:${bounds.north.toFixed(5)}:${bounds.south.toFixed(5)}:${bounds.east.toFixed(5)}:${bounds.west.toFixed(5)}`
}

function queryKey(center: MapCenter, radiusKm: number) {
  return `${center.latitude.toFixed(5)}:${center.longitude.toFixed(5)}:${radiusKm}`
}
