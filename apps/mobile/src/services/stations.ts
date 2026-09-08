import { supabase } from '../lib/supabase'
import type { FuelCode, Station } from '../types'

type Relation<T> = T | T[] | null
type StationRow = { id: string; name: string; latitude: number; longitude: number; address: string | null; station_brands: Relation<{ name: string }> }
type PriceRow = { id: string; station_id: string; price: number; created_at: string; user_trust_score_snapshot: number; fuel_types: Relation<{ code: string }> }
type ServiceRow = { station_id: string; services: Relation<{ code: string; name: string }> }

const first = <T,>(relation: Relation<T>) => Array.isArray(relation) ? relation[0] : relation

export async function loadStations(): Promise<Station[]> {
  if (!supabase) return []
  const recentLimit = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const [stationResult, priceResult, serviceResult] = await Promise.all([
    supabase.from('stations').select('id,name,latitude,longitude,address,station_brands(name)').neq('status', 'rejected'),
    supabase.from('price_submissions').select('id,station_id,price,created_at,user_trust_score_snapshot,fuel_types(code)').gte('created_at', recentLimit).order('created_at', { ascending: false }),
    supabase.from('station_services').select('station_id,services(code,name)').neq('status', 'rejected'),
  ])
  if (stationResult.error) throw stationResult.error
  if (priceResult.error) throw priceResult.error
  if (serviceResult.error) throw serviceResult.error

  const grouped = new Map<string, PriceRow[]>()
  for (const row of (priceResult.data ?? []) as PriceRow[]) {
    const code = first(row.fuel_types)?.code
    if (!code || !['gasolina', 'etanol', 'diesel_s10'].includes(code)) continue
    const key = `${row.station_id}:${code}:${Number(row.price).toFixed(2)}`
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  const winners = new Map<string, PriceRow[]>()
  for (const [key, rows] of grouped) {
    const [stationId, fuel] = key.split(':')
    const winnerKey = `${stationId}:${fuel}`
    const current = winners.get(winnerKey)
    const score = (items: PriceRow[]) => items.length * 100 + items.reduce((sum, item) => sum + Math.min(100, item.user_trust_score_snapshot), 0) * .25
    if (!current || score(rows) > score(current)) winners.set(winnerKey, rows)
  }

  const services = new Map<string, { names: string[]; electric: boolean }>()
  for (const row of (serviceResult.data ?? []) as ServiceRow[]) {
    const service = first(row.services)
    if (!service) continue
    const current = services.get(row.station_id) ?? { names: [], electric: false }
    current.names.push(service.name)
    current.electric ||= service.code === 'recarga_ac' || service.code === 'recarga_dc'
    services.set(row.station_id, current)
  }

  return ((stationResult.data ?? []) as StationRow[]).map((row) => {
    const prices: Station['prices'] = {}
    for (const fuel of ['gasolina', 'etanol', 'diesel_s10'] as FuelCode[]) {
      const reports = winners.get(`${row.id}:${fuel}`)
      if (!reports?.length) continue
      const averageTrust = reports.reduce((sum, report) => sum + Math.min(100, report.user_trust_score_snapshot), 0) / reports.length
      prices[fuel] = { value: Number(reports[0].price), confidence: Math.round(Math.min(99, 20 + Math.log1p(reports.length) * 18 + averageTrust * .35)), reports: reports.length, updatedAt: reports[0].created_at }
    }
    return { id: row.id, name: row.name, brand: first(row.station_brands)?.name ?? 'Sem bandeira', address: row.address ?? 'Endereço não informado', latitude: row.latitude, longitude: row.longitude, distanceKm: 0, rating: 0, hasElectricCharging: services.get(row.id)?.electric ?? false, services: services.get(row.id)?.names ?? [], prices }
  })
}

export async function submitPrice(input: { stationId: string; fuel: FuelCode; price: number; userId: string }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.stationId)) throw new Error('Não foi possível identificar este posto. Atualize a lista e tente novamente.')
  const { data: fuelType, error: fuelError } = await supabase.from('fuel_types').select('id').eq('code', input.fuel).single()
  if (fuelError) throw fuelError
  const { error } = await supabase.from('price_submissions').insert({ station_id: input.stationId, fuel_type_id: fuelType.id, user_id: input.userId, price: input.price, user_trust_score_snapshot: 0 })
  if (error) throw error
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
  const { data: brand, error: brandError } = await supabase.from('station_brands').select('id').eq('name', input.brand).single()
  if (brandError) throw brandError
  const { data: station, error: stationError } = await supabase.from('stations').insert({
    name: input.name.trim(), brand_id: brand.id, address: input.address.trim(), neighborhood: input.neighborhood.trim(), city: input.city.trim(),
    state: input.state.trim().toUpperCase(), postal_code: input.postalCode.trim(), latitude: input.latitude, longitude: input.longitude,
    status: 'pending', created_by: input.userId,
  }).select('id').single()
  if (stationError) throw stationError

  if (input.fuelCodes.length) {
    const { data: fuels, error: fuelError } = await supabase.from('fuel_types').select('id,code').in('code', input.fuelCodes)
    if (fuelError) throw fuelError
    const { error } = await supabase.from('station_fuels').insert((fuels ?? []).map((fuel) => ({ station_id: station.id, fuel_type_id: fuel.id })))
    if (error) throw error
  }
  if (input.serviceCodes.length) {
    const { data: services, error: serviceError } = await supabase.from('services').select('id,code').in('code', input.serviceCodes)
    if (serviceError) throw serviceError
    const { error } = await supabase.from('station_services').insert((services ?? []).map((service) => ({ station_id: station.id, service_id: service.id, status: 'reported', created_by: input.userId })))
    if (error) throw error
  }
  return station.id as string
}
