import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { isNetworkAvailable } from '../utils/connectivity'

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    NetInfo.fetch()
      .then((state) => { if (active) setIsOnline(isNetworkAvailable(state)) })
      .catch(() => { if (active) setIsOnline(null) })
    const unsubscribe = NetInfo.addEventListener((state) => setIsOnline(isNetworkAvailable(state)))
    return () => { active = false; unsubscribe() }
  }, [])

  return isOnline
}
