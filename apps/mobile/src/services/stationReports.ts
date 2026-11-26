import { supabase } from '../lib/supabase'

export type StationExistenceReport = {
  id: string
  stationId: string
  stationName: string
  stationAddress: string
  latitude: number
  longitude: number
  reporterCount: number
  reasons: string[]
  createdAt: string
}

export async function reportStationMissing(stationId: string, reason: string): Promise<void> {
  if (!supabase) throw new Error('Serviço de dados indisponível.')
  const { error } = await supabase.rpc('report_station_missing', {
    target_station_id: stationId,
    report_reason: reason.trim() || null,
  })
  if (error) throw error
}

type ReportRow = {
  id: string
  station_id: string
  reason: string | null
  created_at: string
  stations: { name: string; address: string | null; latitude: number; longitude: number } | { name: string; address: string | null; latitude: number; longitude: number }[] | null
}

export async function loadPendingStationReports(): Promise<StationExistenceReport[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('station_existence_reports')
    .select('id,station_id,reason,created_at,stations(name,address,latitude,longitude)')
    .eq('status', 'pending').order('created_at', { ascending: true }).limit(200)
  if (error) throw error
  const grouped = new Map<string, StationExistenceReport>()
  for (const row of (data ?? []) as unknown as ReportRow[]) {
    const station = Array.isArray(row.stations) ? row.stations[0] : row.stations
    const current = grouped.get(row.station_id)
    if (current) {
      current.reporterCount += 1
      if (row.reason) current.reasons.push(row.reason)
    } else grouped.set(row.station_id, {
      id: row.id, stationId: row.station_id, stationName: station?.name ?? 'Posto',
      stationAddress: station?.address ?? 'Endereço não informado', latitude: station?.latitude ?? 0, longitude: station?.longitude ?? 0, reporterCount: 1,
      reasons: row.reason ? [row.reason] : [], createdAt: row.created_at,
    })
  }
  return [...grouped.values()]
}

export async function moderateStationReport(reportId: string, decision: 'approved' | 'rejected', reason: string): Promise<void> {
  if (!supabase) throw new Error('Serviço de dados indisponível.')
  const { error } = await supabase.rpc('moderate_station_missing_report', {
    target_report_id: reportId, decision, reason: reason.trim() || null,
  })
  if (error) throw error
}
