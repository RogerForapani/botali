import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { recordAppFailure } from '../services/diagnostics'
import { favoritesKey, loadFavorites, toggleFavorite } from '../services/favorites'

export function useFavorites(userId: string | null) {
  const key = favoritesKey(userId)
  const currentKey = useRef(key)
  const [loaded, setLoaded] = useState<{ key: string; ids: string[] } | null>(null)

  useLayoutEffect(() => { currentKey.current = key }, [key])

  useEffect(() => {
    let active = true
    loadFavorites(userId)
      .then((ids) => { if (active) setLoaded({ key, ids }) })
      .catch((error) => {
        recordAppFailure('favorites.load', error).catch(() => undefined)
        if (active) setLoaded({ key, ids: [] })
      })
    return () => { active = false }
  }, [userId, key])

  async function toggle(id: string) {
    try {
      const ids = await toggleFavorite(userId, id)
      if (currentKey.current === key) setLoaded({ key, ids })
    } catch (error) {
      recordAppFailure('favorites.toggle', error).catch(() => undefined)
    }
  }

  return { ids: loaded?.key === key ? loaded.ids : [], toggle }
}
