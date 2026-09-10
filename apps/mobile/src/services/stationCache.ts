import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Station } from '../types'

const CACHE_KEY = '@botali/stations/v1'
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

type StationSnapshot = { savedAt: string; stations: Station[] }

export async function saveStationSnapshot(stations: Station[]) {
  const snapshot: StationSnapshot = { savedAt: new Date().toISOString(), stations }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
}

export async function loadStationSnapshot(): Promise<StationSnapshot | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    const snapshot = JSON.parse(raw) as StationSnapshot
    const age = Date.now() - new Date(snapshot.savedAt).getTime()
    if (!Array.isArray(snapshot.stations) || !Number.isFinite(age) || age > MAX_CACHE_AGE_MS) return null
    return snapshot
  } catch {
    return null
  }
}
