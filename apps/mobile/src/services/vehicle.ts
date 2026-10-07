import AsyncStorage from '@react-native-async-storage/async-storage'
import { isVehicle, type Vehicle } from '../utils/vehicle'

const vehicleKey = (userId: string) => `botali:vehicle:v1:${userId}`

export async function loadVehicle(userId: string): Promise<Vehicle | null> {
  const raw = await AsyncStorage.getItem(vehicleKey(userId))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isVehicle(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function saveVehicle(userId: string, vehicle: Vehicle): Promise<void> {
  if (!isVehicle(vehicle)) throw new Error('Confira os dados do veículo antes de salvar.')
  await AsyncStorage.setItem(vehicleKey(userId), JSON.stringify(vehicle))
}

export async function removeVehicle(userId: string): Promise<void> {
  await AsyncStorage.removeItem(vehicleKey(userId))
}
