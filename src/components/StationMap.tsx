import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapView, Station } from '../types'
import { getEthanolGasolineRatio } from '../utils/flexFuel'

interface Props { stations: Station[]; view: MapView; onSelect: (station: Station) => void }

export function StationMap({ stations, view, onSelect }: Props) {
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
      const price = view === 'electric' ? null : station.prices[view]
      const tone = !price ? 'empty' : price.confidence >= 90 ? 'high' : price.confidence >= 70 ? 'medium' : 'low'
      const ratio = getEthanolGasolineRatio(station)
      const label = view === 'electric' ? '<strong>⚡ Recarga</strong>' : price ? `<strong>R$ ${price.value.toFixed(2).replace('.', ',')}</strong>` : '<strong>Sem preço</strong>'
      const ratioLabel = view !== 'electric' && ratio ? `<small class="marker-ratio ${ratio.favorable ? 'favorable' : ''}">Etanol ${ratio.percentage}%</small>` : ''
      const icon = L.divIcon({ className: 'price-marker', html: `<div class="marker marker-${view === 'electric' ? 'electric' : tone}">${label}${ratioLabel}</div>`, iconSize: [96, ratioLabel ? 52 : 42], iconAnchor: [48, ratioLabel ? 26 : 21] })
      L.marker([station.latitude, station.longitude], { icon }).on('click', () => onSelect(station)).addTo(layer)
    })
  }, [stations, view, onSelect])

  function locate() { navigator.geolocation?.getCurrentPosition(({ coords }) => mapRef.current?.flyTo([coords.latitude, coords.longitude], 14)) }

  return <div className="map-wrap"><div ref={containerRef} className="map" /><button className="locate" onClick={locate} aria-label="Centralizar na minha localização">⌖</button><div className="legend">{view === 'electric' ? <span><i className="electric" />Postos com recarga</span> : <><span><i className="high" />Alta</span><span><i className="medium" />Média</span><span><i className="low" />Baixa confiança</span></>}</div></div>
}
