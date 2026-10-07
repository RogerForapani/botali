import AsyncStorage from '@react-native-async-storage/async-storage'
import { isVehicle, migrateLegacyVehicle, type Vehicle } from '../utils/vehicle'

const vehicleKey = (userId: string) => `botali:vehicle:v2:${userId}`
const legacyKey = (userId: string) => `botali:vehicle:v1:${userId}`

function parseVehicle(raw: string | null): unknown {
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}

export async function loadVehicle(userId: string): Promise<Vehicle | null> {
  const current = parseVehicle(await AsyncStorage.getItem(vehicleKey(userId)))
  if (isVehicle(current)) return current
  const migrated = migrateLegacyVehicle(parseVehicle(await AsyncStorage.getItem(legacyKey(userId))))
  if (!migrated) return null
  await AsyncStorage.setItem(vehicleKey(userId), JSON.stringify(migrated))
  await AsyncStorage.removeItem(legacyKey(userId))
  return migrated
}

export async function saveVehicle(userId: string, vehicle: Vehicle): Promise<void> {
  if (!isVehicle(vehicle)) throw new Error('Confira os dados do veículo antes de salvar.')
  await AsyncStorage.setItem(vehicleKey(userId), JSON.stringify(vehicle))
  await AsyncStorage.removeItem(legacyKey(userId))
}

export async function removeVehicle(userId: string): Promise<void> {
  await AsyncStorage.removeItem(vehicleKey(userId))
  await AsyncStorage.removeItem(legacyKey(userId))
}
