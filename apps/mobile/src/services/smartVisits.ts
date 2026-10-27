import AsyncStorage from '@react-native-async-storage/async-storage'
import * as TaskManager from 'expo-task-manager'

const TASK = 'botali-smart-visits'
const ENABLED_KEY = 'botali:smart-visits:enabled'
const STATIONS_KEY = 'botali:smart-visits:stations'

// Ignora eventos de tarefas antigas; o APK atual não permite localização em segundo plano.
TaskManager.defineTask(TASK, async () => undefined)

export async function disableSmartVisits() {
  const keys = await AsyncStorage.getAllKeys()
  const oldVisitKeys = keys.filter((key) => key.startsWith('botali:visit:enter:') || key.startsWith('botali:prompt:'))
  await AsyncStorage.multiRemove([ENABLED_KEY, STATIONS_KEY, ...oldVisitKeys])
}
