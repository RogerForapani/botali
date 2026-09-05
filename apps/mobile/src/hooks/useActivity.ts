import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type ActivityItem = { id: string; stationName: string; fuelName: string; price: number; createdAt: string }
type Relation<T> = T | T[] | null
type ActivityRow = { id: string; price: number; created_at: string; stations: Relation<{ name: string }>; fuel_types: Relation<{ name: string }> }

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
    const { data, error: requestError } = await supabase
      .from('price_submissions')
      .select('id,price,created_at,stations(name),fuel_types(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setLoading(false)
    if (requestError) { setError('Não foi possível carregar sua atividade.'); return }
    setError('')
    setItems(((data ?? []) as ActivityRow[]).map((row) => ({ id: row.id, price: row.price, createdAt: row.created_at, stationName: relationName(row.stations, 'Posto'), fuelName: relationName(row.fuel_types, 'Combustível') })))
  }, [userId])

  useEffect(() => { refresh() }, [refresh])
  return { items, loading, error, refresh }
}
