import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

// Mantém os alertas de preço visíveis com o app aberto após a retirada dos lembretes de visita.
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) })

export type PriceAlertRule = {
  user_id: string
  fuel_code: string
  center_lat: number
  center_long: number
  radius_km: number
  max_price: number
  push_enabled: boolean
}

export type PriceAlertEvent = {
  id: string
  station_id: string
  station_name: string
  fuel_code: string
  price: number
  confidence: number
  created_at: string
  read_at: string | null
}

function client() {
  if (!supabase) throw new Error('Conexão indisponível. Tente novamente mais tarde.')
  return supabase
}

export async function loadPriceAlertRule(userId: string): Promise<PriceAlertRule | null> {
  const { data, error } = await client().from('price_alert_rules').select('user_id,fuel_code,center_lat,center_long,radius_km,max_price,push_enabled').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as PriceAlertRule | null
}

export async function savePriceAlertRule(rule: PriceAlertRule): Promise<void> {
  const { error } = await client().from('price_alert_rules').upsert({
    ...rule,
    center_lat: Number(rule.center_lat.toFixed(2)),
    center_long: Number(rule.center_long.toFixed(2)),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function removePriceAlertRule(userId: string): Promise<void> {
  await removePriceAlertDevice()
  const { error } = await client().from('price_alert_rules').delete().eq('user_id', userId)
  if (error) throw error
}

export async function loadPriceAlertEvents(): Promise<PriceAlertEvent[]> {
  const { data, error } = await client().from('price_alert_events').select('id,station_id,station_name,fuel_code,price,confidence,created_at,read_at').order('created_at', { ascending: false }).limit(30)
  if (error) throw error
  return (data ?? []) as PriceAlertEvent[]
}

export async function loadPriceAlertEvent(id: string): Promise<PriceAlertEvent | null> {
  const { data, error } = await client().from('price_alert_events')
    .select('id,station_id,station_name,fuel_code,price,confidence,created_at,read_at')
    .eq('id', id).maybeSingle()
  if (error) throw error
  return data as PriceAlertEvent | null
}

export async function markPriceAlertRead(id: string): Promise<void> {
  const { error } = await client().rpc('mark_my_price_alert_read', { alert_id: id })
  if (error) throw error
}

export async function registerPriceAlertDevice(): Promise<void> {
  if (Platform.OS === 'web') throw new Error('As notificações externas estão disponíveis no aplicativo Android/iOS.')
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('price-alerts', { name: 'Alertas de preço', importance: Notifications.AndroidImportance.LOW })
  const permission = await Notifications.requestPermissionsAsync()
  if (!permission.granted) throw new Error('Autorize as notificações do Botali nas configurações do aparelho.')
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) throw new Error('Projeto de notificações não configurado.')
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  const { error } = await client().rpc('register_my_price_alert_device', { push_token: token })
  if (error) throw error
}

export async function restorePriceAlertDevice(userId: string): Promise<void> {
  if (Platform.OS === 'web') return
  const rule = await loadPriceAlertRule(userId)
  if (!rule?.push_enabled) return
  const permission = await Notifications.getPermissionsAsync()
  if (!permission.granted) return
  const { data: { user } } = await client().auth.getUser()
  if (user?.id !== userId) return
  await registerPriceAlertDevice()
}

export async function removePriceAlertDevice(): Promise<void> {
  const { error } = await client().rpc('remove_my_price_alert_device')
  if (error) throw error
}
