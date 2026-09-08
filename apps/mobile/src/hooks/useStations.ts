import { useCallback, useEffect, useState } from 'react'
import { loadStations } from '../services/stations'
import type { Station } from '../types'

export function useStations() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await loadStations()
      setStations(rows)
    } catch {
      setStations([])
      setError('Não foi possível carregar os postos agora.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { stations, loading, error, refresh }
}
