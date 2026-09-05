import { useCallback, useEffect, useState } from 'react'
import { stations as demoStations } from '../data/stations'
import { loadStations } from '../services/stations'

export function useStations() {
  const [stations, setStations] = useState(demoStations)
  const [loading, setLoading] = useState(true)
  const [usingDemo, setUsingDemo] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await loadStations()
      if (rows.length) { setStations(rows); setUsingDemo(false) }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { stations, loading, usingDemo, refresh }
}
