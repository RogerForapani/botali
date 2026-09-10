import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    NetInfo.fetch().then((state) => { if (active) setIsOnline(state.isConnected !== false && state.isInternetReachable !== false) })
    const unsubscribe = NetInfo.addEventListener((state) => setIsOnline(state.isConnected !== false && state.isInternetReachable !== false))
    return () => { active = false; unsubscribe() }
  }, [])

  return isOnline
}
