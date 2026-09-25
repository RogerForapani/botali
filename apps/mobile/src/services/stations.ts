import { supabase } from '../lib/supabase'
import type { FuelCode, Station } from '../types'
import { isPriceStale } from '../utils/priceFreshness'

type Relation<T> = T | T[] | null
type ServiceRow = { station_id: string; services: Relation<{ code: string; name: string }> }
type StationFuelRow = { station_id: string; fuel_types: Relation<{ code: string }> }
type NearbyRow = { id: string; name: string; brand: string | null; latitude: number; longitude: number; address: string | null; distance_m: number; status: 'pending' | 'verified' }
type CommunityPriceRow = { station_id: string; fuel_code: string; price: number; confidence: number; reports: number; confirmations: number; disagreements: number; updated_at: string; submission_id: string | null }
export type MapCenter = { latitude: number; longitude: number }
export type MapBounds = { north: number; south: number; east: number; west: number }

const first = <T,>(relation: Relation<T>) => Array.isArray(relation) ? relation[0] : relation

export async function loadStations(center: MapCenter, radiusKm = 10, offset = 0, limit = 200): Promise<Station[]> {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const client = supabase
  const stationResult = await client.rpc('nearby_stations_v3', { lat: center.latitude, long: center.longitude, radius_m: Math.round(radiusKm * 1000), result_limit: Math.min(200, Math.max(1, Math.round(limit))), result_offset: Math.max(0, Math.round(offset)) })
  if (stationResult.error) throw stationResult.error
  return hydrateStations(client, (stationResult.data ?? []) as NearbyRow[])
}

export async function loadStationsInBounds(bounds: MapBounds, offset = 0, limit = 200): Promise<Station[]> {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const client = supabase
  const stationResult = await client.rpc('stations_in_map_bounds_v1', {
    north_lat: bounds.north,
    south_lat: bounds.south,
    east_long: bounds.east,
    west_long: bounds.west,
    result_limit: Math.min(200, Math.max(1, Math.round(limit))),
    result_offset: Math.max(0, Math.round(offset)),
  })
  if (stationResult.error) throw stationResult.error
  return hydrateStations(client, (stationResult.data ?? []) as NearbyRow[])
}

async function hydrateStations(client: NonNullable<typeof supabase>, nearby: NearbyRow[]): Promise<Station[]> {
  const stationIds = nearby.map((station) => station.id)
  if (!stationIds.length) return []
  const [priceResult, serviceResult, fuelResult] = await Promise.all([
    client.rpc('community_prices_for_stations', { target_station_ids: stationIds }),
    client.from('station_services').select('station_id,services(code,name)').in('station_id', stationIds).eq('status', 'confirmed'),
    client.from('station_fuels').select('station_id,fuel_types(code)').in('station_id', stationIds),
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
        submissionId: item.submission_id ?? undefined,
        stale: !item.submission_id || isPriceStale(item.updated_at),
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

export type StationProfile = {
  address: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  latitude: number
  longitude: number
}

export async function loadStationProfile(stationId: string): Promise<StationProfile> {
  if (!supabase) return { address: '', neighborhood: '', city: '', state: '', postalCode: '', latitude: 0, longitude: 0 }
  const { data, error } = await supabase
    .from('stations')
    .select('address,neighborhood,city,state,postal_code,latitude,longitude')
    .eq('id', stationId)
    .single()
  if (error) throw error
  return {
    address: data.address ?? '',
    neighborhood: data.neighborhood ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    postalCode: data.postal_code ?? '',
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
  }
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

export type StationEditSuggestion = {
  stationId: string
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
}

export async function submitStationEdit(input: StationEditSuggestion) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.rpc('create_station_edit_suggestion_v3', {
    target_station_id: input.stationId,
    proposed_name: input.name.trim(),
    proposed_brand: input.brand.trim(),
    proposed_address: input.address.trim(),
    proposed_neighborhood: input.neighborhood.trim(),
    proposed_city: input.city.trim(),
    proposed_state: input.state.trim().toUpperCase(),
    proposed_postal_code: input.postalCode.trim(),
    proposed_latitude: input.latitude,
    proposed_longitude: input.longitude,
    fuel_codes: input.fuelCodes,
    service_codes: input.serviceCodes,
  })
  if (error) throw error
  return data as string
}
