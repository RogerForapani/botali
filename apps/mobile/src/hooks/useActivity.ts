import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type ActivityItem = {
  id: string
  kind: 'price' | 'station' | 'edit'
  stationName: string
  detail: string
  createdAt: string
  price?: number
  status?: 'pending' | 'verified' | 'rejected' | 'approved'
}
type Relation<T> = T | T[] | null
type ActivityRow = { id: string; price: number; created_at: string; stations: Relation<{ name: string }>; fuel_types: Relation<{ name: string }> }
type StationActivityRow = { id: string; name: string; status: 'pending' | 'verified' | 'rejected'; created_at: string }
type EditActivityRow = { id: string; status: 'pending' | 'approved' | 'rejected'; created_at: string; stations: Relation<{ name: string }> }

function relationName(value: Relation<{ name: string }>, fallback: string) {
  const item = Array.isArray(value) ? value[0] : value
  return item?.name ?? fallback
}

export function useActivity(userId?: string) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!userId || !supabase) { setItems([]); setError(''); return }
    setLoading(true)
    const [prices, stations, edits] = await Promise.all([
      supabase.from('price_submissions').select('id,price,created_at,stations(name),fuel_types(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('stations').select('id,name,status,created_at').eq('created_by', userId).order('created_at', { ascending: false }).limit(30),
      supabase.from('station_edit_requests').select('id,status,created_at,stations(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    ])
    setLoading(false)
    if (prices.error || stations.error || edits.error) { setError('Não foi possível carregar sua atividade.'); return }
    setError('')
    const priceItems: ActivityItem[] = ((prices.data ?? []) as ActivityRow[]).map((row) => ({ id: `price-${row.id}`, kind: 'price', price: row.price, createdAt: row.created_at, stationName: relationName(row.stations, 'Posto'), detail: relationName(row.fuel_types, 'Combustível') }))
    const stationItems: ActivityItem[] = ((stations.data ?? []) as StationActivityRow[]).map((row) => ({ id: `station-${row.id}`, kind: 'station', status: row.status, createdAt: row.created_at, stationName: row.name, detail: 'Cadastro de posto' }))
    const editItems: ActivityItem[] = ((edits.data ?? []) as unknown as EditActivityRow[]).map((row) => ({ id: `edit-${row.id}`, kind: 'edit', status: row.status, createdAt: row.created_at, stationName: relationName(row.stations, 'Posto'), detail: 'Correção de dados' }))
    setItems([...priceItems, ...stationItems, ...editItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }, [userId])

  useEffect(() => { refresh() }, [refresh])
  return { items, loading, error, refresh }
}
