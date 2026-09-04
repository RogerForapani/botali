import { supabase } from '../lib/supabase'
import type { Station } from '../types'

type BrandRow = { name: string } | { name: string }[] | null
type StationRow = { id: string; name: string; latitude: number; longitude: number; address: string | null; station_brands: BrandRow }

export async function loadStations(): Promise<Station[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('stations').select('id,name,latitude,longitude,address,station_brands(name)').neq('status', 'rejected')
  if (error) throw error
  return ((data ?? []) as StationRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    brand: Array.isArray(row.station_brands) ? row.station_brands[0]?.name ?? 'Sem bandeira' : row.station_brands?.name ?? 'Sem bandeira',
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? 'Endereço ainda não informado',
    distanceKm: 0,
    rating: 0,
    services: [],
    prices: {},
  }))
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
