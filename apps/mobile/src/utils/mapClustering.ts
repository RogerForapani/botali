import type { Station } from '../types'

type RegionLike = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }
export type StationMapItem = { kind: 'station'; id: string; station: Station }
export type StationClusterItem = { kind: 'cluster'; id: string; latitude: number; longitude: number; stations: Station[] }
export type StationMapItemOrCluster = StationMapItem | StationClusterItem

export function clusterStations(stations: Station[], region: RegionLike, selectedId?: string | null): StationMapItemOrCluster[] {
  if (stations.length < 2) return stations.map(toStationItem)
  const latitudeCell = Math.max(region.latitudeDelta / 11, .00002)
  const longitudeCell = Math.max(region.longitudeDelta / 6, .00002)
  const south = region.latitude - region.latitudeDelta / 2
  const west = region.longitude - region.longitudeDelta / 2
  const groups = new Map<string, Station[]>()
  const selected: StationMapItem[] = []

  for (const station of stations) {
    if (station.id === selectedId) { selected.push(toStationItem(station)); continue }
    const row = Math.floor((station.latitude - south) / latitudeCell)
    const column = Math.floor((station.longitude - west) / longitudeCell)
    const key = `${row}:${column}`
    groups.set(key, [...(groups.get(key) ?? []), station])
  }

  const clustered = [...groups.entries()].map<StationMapItemOrCluster>(([key, members]) => {
    if (members.length === 1) return toStationItem(members[0])
    return {
      kind: 'cluster',
      id: `cluster:${key}`,
      latitude: members.reduce((sum, station) => sum + station.latitude, 0) / members.length,
      longitude: members.reduce((sum, station) => sum + station.longitude, 0) / members.length,
      stations: members,
    }
  })
  return [...clustered, ...selected]
}

function toStationItem(station: Station): StationMapItem {
  return { kind: 'station', id: station.id, station }
}
