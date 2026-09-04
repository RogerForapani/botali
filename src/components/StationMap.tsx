import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FuelCode, Station } from '../types'

interface Props { stations: Station[]; fuel: FuelCode; onSelect: (station: Station) => void }

export function StationMap({ stations, fuel, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: false }).setView([-20.0247, -44.0562], 13)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    stations.forEach((station) => {
      const price = station.prices[fuel]
      const tone = !price ? 'empty' : price.confidence >= 90 ? 'high' : price.confidence >= 70 ? 'medium' : 'low'
      const label = price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'
      const icon = L.divIcon({ className: 'price-marker', html: `<button class="marker marker-${tone}">${label}</button>`, iconSize: [86, 38], iconAnchor: [43, 19] })
      L.marker([station.latitude, station.longitude], { icon }).on('click', () => onSelect(station)).addTo(layer)
    })
  }, [stations, fuel, onSelect])

  function locate() { navigator.geolocation?.getCurrentPosition(({ coords }) => mapRef.current?.flyTo([coords.latitude, coords.longitude], 14)) }

  return <div className="map-wrap"><div ref={containerRef} className="map" /><button className="locate" onClick={locate} aria-label="Centralizar na minha localização">⌖</button><div className="legend"><span><i className="high" />Alta</span><span><i className="medium" />Média</span><span><i className="low" />Baixa confiança</span></div></div>
}
