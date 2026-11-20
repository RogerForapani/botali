import type { Station } from '../types'

type RegionLike = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }
export type StationMapItem = { kind: 'station'; id: string; station: Station }
export type StationClusterItem = { kind: 'cluster'; id: string; latitude: number; longitude: number; stations: Station[] }
export type StationMapItemOrCluster = StationMapItem | StationClusterItem

export function clusterStations(stations: Station[], region: RegionLike, selectedId?: string | null): StationMapItemOrCluster[] {
  if (stations.length < 2) return stations.map(toStationItem)
  const latitudeCell = snapCellSize(region.latitudeDelta / 11)
  const longitudeCell = snapCellSize(region.longitudeDelta / 6)
  const groups = new Map<string, Station[]>()
  const selected: StationMapItem[] = []

  for (const station of stations) {
    if (station.id === selectedId) { selected.push(toStationItem(station)); continue }
    const row = Math.floor(station.latitude / latitudeCell)
    const column = Math.floor(station.longitude / longitudeCell)
    const key = `${row}:${column}`
    const members = groups.get(key)
    if (members) members.push(station)
    else groups.set(key, [station])
  }

  const clustered = [...groups.entries()].map<StationMapItemOrCluster>(([key, members]) => {
    if (members.length === 1) return toStationItem(members[0])
    return {
      kind: 'cluster',
      id: `cluster:${key}:${members.length}:${clusterFingerprint(members)}`,
      latitude: members.reduce((sum, station) => sum + station.latitude, 0) / members.length,
      longitude: members.reduce((sum, station) => sum + station.longitude, 0) / members.length,
      stations: members,
    }
  })
  return [...clustered, ...selected]
}

function snapCellSize(size: number) {
  return 2 ** (Math.round(Math.log2(Math.max(size, .00002)) * 2) / 2)
}

export function shouldRebuildMapAfterZoom(previous: RegionLike, next: RegionLike, threshold = .15) {
  return relativeChange(previous.latitudeDelta, next.latitudeDelta) >= threshold
    || relativeChange(previous.longitudeDelta, next.longitudeDelta) >= threshold
}

function toStationItem(station: Station): StationMapItem {
  return { kind: 'station', id: station.id, station }
}

function clusterFingerprint(stations: Station[]) {
  let hash = 2166136261
  for (const character of stations.map((station) => station.id).sort().join('|')) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function relativeChange(previous: number, next: number) {
  return previous > 0 ? Math.abs(next - previous) / previous : Number.POSITIVE_INFINITY
}
