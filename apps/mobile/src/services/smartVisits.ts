import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

const TASK = 'botali-smart-visits'
const ENABLED_KEY = 'botali:smart-visits:enabled'
const STATIONS_KEY = 'botali:smart-visits:stations'

// Mantém o nome da tarefa para neutralizar eventos antigos até que as geofences sejam removidas.
TaskManager.defineTask(TASK, async () => undefined)

export async function disableSmartVisits() {
  try {
    if (await Location.hasStartedGeofencingAsync(TASK)) await Location.stopGeofencingAsync(TASK)
  } finally {
    const keys = await AsyncStorage.getAllKeys()
    const oldVisitKeys = keys.filter((key) => key.startsWith('botali:visit:enter:') || key.startsWith('botali:prompt:'))
    await AsyncStorage.multiRemove([ENABLED_KEY, STATIONS_KEY, ...oldVisitKeys])
  }
}
