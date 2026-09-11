import { supabase } from '../lib/supabase'

type Relation<T> = T | T[] | null
type NamedRelation = { name: string }

type PendingStationRow = {
  id: string
  name: string
  brand_name_override: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  latitude: number
  longitude: number
  created_at: string
  station_brands: Relation<NamedRelation>
  station_fuels: Array<{ fuel_types: Relation<NamedRelation> }> | null
  station_services: Array<{ status: string; services: Relation<NamedRelation> }> | null
  price_submissions: Array<{ price: number; created_at: string; fuel_types: Relation<NamedRelation> }> | null
}

export type AccountRole = 'user' | 'moderator' | 'admin'
export type ModerationDecision = 'verified' | 'rejected'

export type PendingStation = {
  id: string
  name: string
  brand: string
  address: string
  latitude: number
  longitude: number
  createdAt: string
  fuels: string[]
  services: string[]
  priceReports: Array<{ fuel: string; price: number; createdAt: string }>
}

const first = <T,>(relation: Relation<T>) => Array.isArray(relation) ? relation[0] : relation

export async function loadMyRole(userId: string): Promise<AccountRole> {
  if (!supabase) return 'user'
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
  if (error) throw error
  return (data.role as AccountRole) ?? 'user'
}

export async function loadPendingStations(): Promise<PendingStation[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('stations')
    .select('id,name,brand_name_override,address,neighborhood,city,state,postal_code,latitude,longitude,created_at,station_brands(name),station_fuels(fuel_types(name)),station_services(status,services(name)),price_submissions(price,created_at,fuel_types(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error

  return ((data ?? []) as unknown as PendingStationRow[]).map((row) => {
    const addressParts = [row.address, row.neighborhood, [row.city, row.state].filter(Boolean).join(' - '), row.postal_code].filter(Boolean)
    return {
      id: row.id,
      name: row.name,
      brand: row.brand_name_override || first(row.station_brands)?.name || 'Sem bandeira',
      address: addressParts.join(' · ') || 'Endereço não informado',
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      createdAt: row.created_at,
      fuels: (row.station_fuels ?? []).map((item) => first(item.fuel_types)?.name).filter((name): name is string => Boolean(name)),
      services: (row.station_services ?? []).filter((item) => item.status === 'reported').map((item) => first(item.services)?.name).filter((name): name is string => Boolean(name)),
      priceReports: (row.price_submissions ?? []).map((item) => ({ fuel: first(item.fuel_types)?.name ?? 'Combustível', price: Number(item.price), createdAt: item.created_at })),
    }
  })
}

export async function moderateStation(input: { stationId: string; decision: ModerationDecision; reason?: string }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.rpc('moderate_station', {
    target_station_id: input.stationId,
    decision: input.decision,
    reason: input.reason?.trim() || null,
  })
  if (error) throw error
}

type EditPayload = { name?: string; brand?: string; address?: string; neighborhood?: string; city?: string; state?: string; postal_code?: string; fuel_codes?: string[]; service_codes?: string[] }
type PendingEditRow = { id: string; created_at: string; old_value: EditPayload; new_value: EditPayload; stations: Relation<{ name: string }> }
export type EditModerationDecision = 'approved' | 'rejected'
export type PendingStationEdit = { id: string; stationName: string; createdAt: string; before: EditPayload; after: EditPayload }

export async function loadPendingStationEdits(): Promise<PendingStationEdit[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('station_edit_requests')
    .select('id,created_at,old_value,new_value,stations(name)')
    .eq('status', 'pending')
    .eq('field_name', 'station_profile')
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as PendingEditRow[]).map((row) => ({
    id: row.id,
    stationName: first(row.stations)?.name ?? 'Posto',
    createdAt: row.created_at,
    before: row.old_value ?? {},
    after: row.new_value ?? {},
  }))
}

export async function moderateStationEdit(input: { requestId: string; decision: EditModerationDecision; reason?: string }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { error } = await supabase.rpc('moderate_station_edit_request', {
    target_request_id: input.requestId,
    decision: input.decision,
    reason: input.reason?.trim() || null,
  })
  if (error) throw error
}
