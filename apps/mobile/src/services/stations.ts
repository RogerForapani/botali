import { supabase } from '../lib/supabase'
import type { FuelCode, Station } from '../types'

type Relation<T> = T | T[] | null
type ServiceRow = { station_id: string; services: Relation<{ code: string; name: string }> }
type StationFuelRow = { station_id: string; fuel_types: Relation<{ code: string }> }
type NearbyRow = { id: string; name: string; brand: string | null; latitude: number; longitude: number; address: string | null; distance_m: number; status: 'pending' | 'verified' }
type CommunityPriceRow = { station_id: string; fuel_code: string; price: number; confidence: number; reports: number; confirmations: number; disagreements: number; updated_at: string; submission_id: string }
export type MapCenter = { latitude: number; longitude: number }

const first = <T,>(relation: Relation<T>) => Array.isArray(relation) ? relation[0] : relation

export async function loadStations(center: MapCenter, radiusKm = 10): Promise<Station[]> {
  if (!supabase) return []
  const stationResult = await supabase.rpc('nearby_stations_v2', { lat: center.latitude, long: center.longitude, radius_m: Math.round(radiusKm * 1000) })
  if (stationResult.error) throw stationResult.error
  const nearby = (stationResult.data ?? []) as NearbyRow[]
  const stationIds = nearby.map((station) => station.id)
  if (!stationIds.length) return []
  const [priceResult, serviceResult, fuelResult] = await Promise.all([
    supabase.rpc('community_prices_for_stations', { target_station_ids: stationIds }),
    supabase.from('station_services').select('station_id,services(code,name)').in('station_id', stationIds).eq('status', 'confirmed'),
    supabase.from('station_fuels').select('station_id,fuel_types(code)').in('station_id', stationIds),
  ])
  if (priceResult.error) throw priceResult.error
  if (serviceResult.error) throw serviceResult.error
  if (fuelResult.error) throw fuelResult.error

  const communityPrices = (priceResult.data ?? []) as CommunityPriceRow[]

  const services = new Map<string, { names: string[]; codes: string[]; electric: boolean }>()
  for (const row of (serviceResult.data ?? []) as ServiceRow[]) {
    const service = first(row.services)
    if (!service) continue
    const current = services.get(row.station_id) ?? { names: [], codes: [], electric: false }
    current.names.push(service.name)
    current.codes.push(service.code)
    current.electric ||= service.code === 'recarga_ac' || service.code === 'recarga_dc'
    services.set(row.station_id, current)
  }
  const stationFuels = new Map<string, FuelCode[]>()
  for (const row of (fuelResult.data ?? []) as StationFuelRow[]) {
    const code = first(row.fuel_types)?.code as FuelCode | undefined
    if (code) stationFuels.set(row.station_id, [...(stationFuels.get(row.station_id) ?? []), code])
  }

  return nearby.map((row) => {
    const prices: Station['prices'] = {}
    for (const item of communityPrices) {
      if (item.station_id !== row.id) continue
      prices[item.fuel_code] = {
        value: Number(item.price),
        confidence: Number(item.confidence),
        reports: Number(item.reports),
        confirmations: Number(item.confirmations),
        disagreements: Number(item.disagreements),
        updatedAt: item.updated_at,
        submissionId: item.submission_id,
      }
    }
    return { id: row.id, name: row.name, brand: row.brand ?? 'Sem bandeira', status: row.status, address: row.address ?? 'Endereço não informado', latitude: row.latitude, longitude: row.longitude, distanceKm: Number(row.distance_m) / 1000, rating: 0, hasElectricCharging: services.get(row.id)?.electric ?? false, services: services.get(row.id)?.names ?? [], serviceCodes: services.get(row.id)?.codes ?? [], fuelCodes: stationFuels.get(row.id) ?? [], prices }
  })
}

export async function loadStationOptions() {
  if (!supabase) return { brands: [], fuels: [], services: [] }
  const [brands, fuels, services] = await Promise.all([
    supabase.from('station_brands').select('name').eq('active', true).order('name'),
    supabase.from('fuel_types').select('code,name').eq('active', true).order('name'),
    supabase.from('services').select('code,name').eq('active', true).order('name'),
  ])
  if (brands.error) throw brands.error
  if (fuels.error) throw fuels.error
  if (services.error) throw services.error
  return { brands: brands.data ?? [], fuels: fuels.data ?? [], services: services.data ?? [] }
}

export async function submitPrices(input: { stationId: string; prices: { fuel: FuelCode; price: number }[]; userId: string }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.stationId)) throw new Error('Não foi possível identificar este posto. Atualize a lista e tente novamente.')
  const fuelCodes = input.prices.map((item) => item.fuel)
  const { data: fuelTypes, error: fuelError } = await supabase.from('fuel_types').select('id,code').in('code', fuelCodes)
  if (fuelError) throw fuelError
  const fuelIds = new Map((fuelTypes ?? []).map((item) => [item.code, item.id]))
  if (fuelIds.size !== input.prices.length) throw new Error('Um dos combustíveis selecionados não está disponível.')
  const submissions = input.prices.map((item) => ({ station_id: input.stationId, fuel_type_id: fuelIds.get(item.fuel), user_id: input.userId, price: item.price, user_trust_score_snapshot: 0 }))
  const { error } = await supabase.from('price_submissions').insert(submissions)
  if (error) throw error
}

export async function submitPrice(input: { stationId: string; fuel: FuelCode; price: number; userId: string }) {
  return submitPrices({ stationId: input.stationId, prices: [{ fuel: input.fuel, price: input.price }], userId: input.userId })
}

export async function confirmPriceAtStation(input: { submissionId: string; latitude: number; longitude: number; agrees: boolean }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.rpc('confirm_price_at_station', {
    submission_id: input.submissionId,
    lat: input.latitude,
    long: input.longitude,
    agrees: input.agrees,
  })
  if (error) throw error
  return Number(data)
}

export type StationSuggestion = {
  name: string
  brand: string
  address: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  latitude: number
  longitude: number
  fuelCodes: string[]
  serviceCodes: string[]
  userId: string
}

export async function submitStation(input: StationSuggestion) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.rpc('create_station_suggestion', { station_name: input.name.trim(), brand_name: input.brand, station_address: input.address.trim(), station_neighborhood: input.neighborhood.trim(), station_city: input.city.trim(), station_state: input.state.trim().toUpperCase(), station_postal_code: input.postalCode.trim(), lat: input.latitude, long: input.longitude, fuel_codes: input.fuelCodes, service_codes: input.serviceCodes })
  if (error) throw error
  return data as string
}
