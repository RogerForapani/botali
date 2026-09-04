import { supabase } from '../lib/supabase'
import type { FuelCode, Station } from '../types'

type BrandRow = { name: string } | { name: string }[] | null
type StationRow = { id: string; name: string; latitude: number; longitude: number; address: string | null; station_brands: BrandRow }
type FuelTypeRow = { code: string } | { code: string }[] | null
type PriceRow = { station_id: string; price: number; user_trust_score_snapshot: number; created_at: string; fuel_types: FuelTypeRow }
type ServiceRow = { station_id: string; services: { name: string } | { name: string }[] | null }

function relationName(relation: { name: string } | { name: string }[] | null) {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

export async function loadStations(): Promise<Station[]> {
  if (!supabase) return []
  const [stationsResult, pricesResult, servicesResult] = await Promise.all([
    supabase.from('stations').select('id,name,latitude,longitude,address,station_brands(name)').neq('status', 'rejected'),
    supabase.from('price_submissions').select('station_id,price,user_trust_score_snapshot,created_at,fuel_types(code)').order('created_at', { ascending: false }),
    supabase.from('station_services').select('station_id,services(name)').neq('status', 'rejected'),
  ])
  if (stationsResult.error) throw stationsResult.error
  if (pricesResult.error) throw pricesResult.error
  if (servicesResult.error) throw servicesResult.error

  const latestPrices = new Map<string, PriceRow>()
  for (const price of (pricesResult.data ?? []) as PriceRow[]) {
    const fuelRelation = price.fuel_types
    const code = Array.isArray(fuelRelation) ? fuelRelation[0]?.code : fuelRelation?.code
    if (!code || !['gasolina', 'etanol', 'diesel_s10'].includes(code)) continue
    const key = `${price.station_id}:${code}`
    if (!latestPrices.has(key)) latestPrices.set(key, price)
  }

  const servicesByStation = new Map<string, string[]>()
  for (const item of (servicesResult.data ?? []) as ServiceRow[]) {
    const name = relationName(item.services)
    if (!name) continue
    servicesByStation.set(item.station_id, [...(servicesByStation.get(item.station_id) ?? []), name])
  }

  return ((stationsResult.data ?? []) as StationRow[]).map((row) => {
    const prices: Station['prices'] = {}
    for (const code of ['gasolina', 'etanol', 'diesel_s10'] as FuelCode[]) {
      const submission = latestPrices.get(`${row.id}:${code}`)
      if (!submission) continue
      prices[code] = {
        value: Number(submission.price),
        confidence: Math.min(100, submission.user_trust_score_snapshot),
        confirmations: 1,
        updatedMinutes: Math.max(0, Math.round((Date.now() - new Date(submission.created_at).getTime()) / 60000)),
      }
    }
    return {
    id: row.id,
    name: row.name,
    brand: Array.isArray(row.station_brands) ? row.station_brands[0]?.name ?? 'Sem bandeira' : row.station_brands?.name ?? 'Sem bandeira',
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? 'Endereço ainda não informado',
    distanceKm: 0,
    rating: 0,
    services: servicesByStation.get(row.id) ?? [],
    prices,
  }})
}

export async function getBrands() {
  if (!supabase) return []
  const { data, error } = await supabase.from('station_brands').select('id,name').eq('active', true).order('name')
  if (error) throw error
  return data ?? []
}

export async function createStation(input: { name: string; brandId: string | null; latitude: number; longitude: number; address: string; userId: string }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data: nearby, error: nearbyError } = await supabase.rpc('nearby_stations', { lat: input.latitude, long: input.longitude, radius_m: 100 })
  if (nearbyError) throw nearbyError
  if (nearby?.length) throw new Error(`Já existe um posto muito próximo: ${nearby[0].name}.`)
  const { error } = await supabase.from('stations').insert({ name: input.name, brand_id: input.brandId, latitude: input.latitude, longitude: input.longitude, address: input.address || null, created_by: input.userId, status: 'pending' })
  if (error) throw error
}

export async function createPriceSubmission(input: { stationId: string; fuel: FuelCode; price: number; userId: string; coords?: { latitude: number; longitude: number } | null }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data: fuelType, error: fuelError } = await supabase.from('fuel_types').select('id').eq('code', input.fuel).single()
  if (fuelError) throw fuelError

  const { error } = await supabase.from('price_submissions').insert({
    station_id: input.stationId,
    fuel_type_id: fuelType.id,
    user_id: input.userId,
    price: input.price,
    user_trust_score_snapshot: 0,
    submitted_location: input.coords ? `POINT(${input.coords.longitude} ${input.coords.latitude})` : null,
  })
  if (error) throw error
}
