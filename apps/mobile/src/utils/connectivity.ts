export type ConnectivityState = { isConnected: boolean | null; isInternetReachable: boolean | null }

export function isNetworkAvailable(state: ConnectivityState) {
  return state.isConnected !== false && state.isInternetReachable !== false
}
