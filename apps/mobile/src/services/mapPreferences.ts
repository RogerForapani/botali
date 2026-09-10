import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MapCenter } from './stations'

const PREFERENCES_KEY = '@botali/map-preferences/v1'

export type MapPreferences = { center: MapCenter; radiusKm: number }

export function normalizeMapPreferences(preferences: MapPreferences): MapPreferences {
  return {
    center: {
      latitude: Math.round(Math.max(-90, Math.min(90, preferences.center.latitude)) * 1000) / 1000,
      longitude: Math.round(Math.max(-180, Math.min(180, preferences.center.longitude)) * 1000) / 1000,
    },
    radiusKm: Math.max(2, Math.min(100, Math.round(preferences.radiusKm))),
  }
}

export async function saveMapPreferences(preferences: MapPreferences) {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalizeMapPreferences(preferences)))
}

export async function loadMapPreferences(): Promise<MapPreferences | null> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as MapPreferences
    if (!Number.isFinite(parsed?.center?.latitude) || !Number.isFinite(parsed?.center?.longitude) || !Number.isFinite(parsed?.radiusKm)) return null
    return normalizeMapPreferences(parsed)
  } catch {
    return null
  }
}
