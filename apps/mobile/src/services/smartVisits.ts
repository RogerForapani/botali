import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import type { Station } from '../types'

const TASK = 'botali-smart-visits'
const ENABLED_KEY = 'botali:smart-visits:enabled'
const STATIONS_KEY = 'botali:smart-visits:stations'
const MIN_DWELL_MS = 3 * 60 * 1000
const GLOBAL_COOLDOWN_MS = 24 * 60 * 60 * 1000
const STATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) })

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !data) return
  const { eventType, region } = data as { eventType: Location.GeofencingEventType; region: Location.LocationRegion }
  if (!region.identifier) return
  const enterKey = `botali:visit:enter:${region.identifier}`
  if (eventType === Location.GeofencingEventType.Enter) {
    await AsyncStorage.setItem(enterKey, String(Date.now()))
    return
  }
  if (eventType !== Location.GeofencingEventType.Exit) return
  const enteredAt = Number(await AsyncStorage.getItem(enterKey))
  await AsyncStorage.removeItem(enterKey)
  if (!enteredAt || Date.now() - enteredAt < MIN_DWELL_MS) return

  const globalPrompt = Number(await AsyncStorage.getItem('botali:prompt:last'))
  const stationPrompt = Number(await AsyncStorage.getItem(`botali:prompt:${region.identifier}`))
  if (Date.now() - globalPrompt < GLOBAL_COOLDOWN_MS || Date.now() - stationPrompt < STATION_COOLDOWN_MS) return
  const stationMap = JSON.parse(await AsyncStorage.getItem(STATIONS_KEY) ?? '{}') as Record<string, string>
  const stationName = stationMap[region.identifier] ?? 'esse posto'
  await Notifications.scheduleNotificationAsync({ content: { title: 'Preço bom é preço confirmado', body: `Você passou pelo ${stationName}. O preço que viu estava certo?`, data: { stationId: region.identifier } }, trigger: null })
  await AsyncStorage.multiSet([['botali:prompt:last', String(Date.now())], [`botali:prompt:${region.identifier}`, String(Date.now())]])
})

export async function smartVisitsEnabled() {
  return await AsyncStorage.getItem(ENABLED_KEY) === 'true'
}

export async function enableSmartVisits(stations: Station[]) {
  const foreground = await Location.requestForegroundPermissionsAsync()
  if (!foreground.granted) throw new Error('A localização em uso precisa ser autorizada primeiro.')
  const background = await Location.requestBackgroundPermissionsAsync()
  if (!background.granted) throw new Error('A localização em segundo plano não foi autorizada.')
  const notifications = await Notifications.requestPermissionsAsync()
  if (!notifications.granted) throw new Error('As notificações precisam ser autorizadas para enviar lembretes.')
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('visits', { name: 'Lembretes de visitas', importance: Notifications.AndroidImportance.DEFAULT })

  const monitored = stations.slice(0, Platform.OS === 'ios' ? 20 : 100)
  await AsyncStorage.setItem(STATIONS_KEY, JSON.stringify(Object.fromEntries(monitored.map((station) => [station.id, station.name]))))
  await Location.startGeofencingAsync(TASK, monitored.map((station) => ({ identifier: station.id, latitude: station.latitude, longitude: station.longitude, radius: 200, notifyOnEnter: true, notifyOnExit: true })))
  await AsyncStorage.setItem(ENABLED_KEY, 'true')
}

export async function disableSmartVisits() {
  if (await Location.hasStartedGeofencingAsync(TASK)) await Location.stopGeofencingAsync(TASK)
  await AsyncStorage.setItem(ENABLED_KEY, 'false')
}
