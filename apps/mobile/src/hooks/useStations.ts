import { useCallback, useEffect, useState } from 'react'
import { loadStations, type MapCenter } from '../services/stations'
import type { Station } from '../types'

export function useStations(initialCenter: MapCenter, initialRadiusKm: number) {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (center = initialCenter, radiusKm = initialRadiusKm) => {
    setLoading(true)
    setError(null)
    try {
      const rows = await loadStations(center, radiusKm)
      setStations(rows)
    } catch {
      setStations([])
      setError('Não foi possível carregar os postos agora.')
    } finally {
      setLoading(false)
    }
  }, [initialCenter, initialRadiusKm])

  useEffect(() => { refresh() }, [refresh])
  return { stations, loading, error, refresh }
}
