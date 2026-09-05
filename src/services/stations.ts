import { supabase } from '../lib/supabase'
import type { FuelCode, Station } from '../types'

type BrandRow = { name: string } | { name: string }[] | null
type StationRow = { id: string; name: string; latitude: number; longitude: number; address: string | null; station_brands: BrandRow }
type FuelTypeRow = { code: string } | { code: string }[] | null
type PriceRow = { id: string; station_id: string; price: number; user_trust_score_snapshot: number; created_at: string; fuel_types: FuelTypeRow }
type ServiceRow = { station_id: string; services: { name: string } | { name: string }[] | null }
type ConfirmationRow = { submission_id: string; agrees: boolean; trust_score_snapshot: number }

function relationName(relation: { name: string } | { name: string }[] | null) {
  return Array.isArray(relation) ? relation[0]?.name : relation?.name
}

export async function loadStations(): Promise<Station[]> {
  if (!supabase) return []
  const recentLimit = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const [stationsResult, pricesResult, servicesResult, confirmationsResult] = await Promise.all([
    supabase.from('stations').select('id,name,latitude,longitude,address,station_brands(name)').neq('status', 'rejected'),
    supabase.from('price_submissions').select('id,station_id,price,user_trust_score_snapshot,created_at,fuel_types(code)').gte('created_at', recentLimit).order('created_at', { ascending: false }),
    supabase.from('station_services').select('station_id,services(name)').neq('status', 'rejected'),
    supabase.from('price_confirmations').select('submission_id,agrees,trust_score_snapshot'),
  ])
  if (stationsResult.error) throw stationsResult.error
  if (pricesResult.error) throw pricesResult.error
  if (servicesResult.error) throw servicesResult.error
  if (confirmationsResult.error) throw confirmationsResult.error

  const confirmationWeights = new Map<string, { agrees: number; disagrees: number }>()
  for (const confirmation of (confirmationsResult.data ?? []) as ConfirmationRow[]) {
    const weights = confirmationWeights.get(confirmation.submission_id) ?? { agrees: 0, disagrees: 0 }
    const weight = 1 + Math.min(100, confirmation.trust_score_snapshot) / 100
    if (confirmation.agrees) weights.agrees += weight
    else weights.disagrees += weight
    confirmationWeights.set(confirmation.submission_id, weights)
  }

  const priceGroups = new Map<string, PriceRow[]>()
  for (const price of (pricesResult.data ?? []) as PriceRow[]) {
    const fuelRelation = price.fuel_types
    const code = Array.isArray(fuelRelation) ? fuelRelation[0]?.code : fuelRelation?.code
    if (!code || !['gasolina', 'etanol', 'diesel_s10'].includes(code)) continue
    const key = `${price.station_id}:${code}:${Number(price.price).toFixed(2)}`
    priceGroups.set(key, [...(priceGroups.get(key) ?? []), price])
  }

  const consensusPrices = new Map<string, { rows: PriceRow[]; score: number; agrees: number; disagrees: number }>()
  for (const [groupKey, rows] of priceGroups) {
    const [stationId, fuelCode] = groupKey.split(':')
    let agrees = 0
    let disagrees = 0
    for (const row of rows) {
      const weights = confirmationWeights.get(row.id)
      agrees += weights?.agrees ?? 0
      disagrees += weights?.disagrees ?? 0
    }
    const reputation = rows.reduce((total, row) => total + Math.min(100, row.user_trust_score_snapshot), 0)
    const score = rows.length * 100 + reputation * 0.25 + agrees * 30 - disagrees * 40
    const consensusKey = `${stationId}:${fuelCode}`
    const current = consensusPrices.get(consensusKey)
    if (!current || score > current.score) consensusPrices.set(consensusKey, { rows, score, agrees, disagrees })
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
      const consensus = consensusPrices.get(`${row.id}:${code}`)
      if (!consensus) continue
      const submission = consensus.rows[0]
      const averageTrust = consensus.rows.reduce((total, item) => total + Math.min(100, item.user_trust_score_snapshot), 0) / consensus.rows.length
      const confidence = Math.round(Math.min(99, Math.max(10, 20 + Math.log1p(consensus.rows.length) * 18 + averageTrust * 0.35 + consensus.agrees * 4 - consensus.disagrees * 7)))
      prices[code] = {
        submissionId: submission.id,
        value: Number(submission.price),
        confidence,
        confirmations: Math.round(consensus.agrees),
        reports: consensus.rows.length,
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

export async function checkInStation(stationId: string, coords: { latitude: number; longitude: number }) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.rpc('check_in_station', { station_id: stationId, lat: coords.latitude, long: coords.longitude })
  if (error) throw error
  return Number(data)
}

export async function confirmPriceAtStation(submissionId: string, coords: { latitude: number; longitude: number }, agrees = true) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.rpc('confirm_price_at_station', { submission_id: submissionId, lat: coords.latitude, long: coords.longitude, agrees })
  if (error) throw error
  return Number(data)
}
