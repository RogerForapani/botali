import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

const KEY = 'botali:favorites'

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => { AsyncStorage.getItem(KEY).then((value) => setIds(value ? JSON.parse(value) : [])) }, [])
  function toggle(id: string) {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      AsyncStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }
  return { ids, toggle }
}
