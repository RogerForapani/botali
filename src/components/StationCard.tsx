import type { FuelCode, Station } from '../types'

const labels: Record<FuelCode, string> = { gasolina: 'Gasolina comum', etanol: 'Etanol', diesel_s10: 'Diesel S10' }
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function StationCard({ station, fuel, onSelect }: { station: Station; fuel: FuelCode; onSelect: () => void }) {
  const price = station.prices[fuel]
  const tone = !price ? 'low' : price.confidence >= 90 ? 'high' : price.confidence >= 70 ? 'medium' : 'low'
  return <article className="station-card" onClick={onSelect}>
    <div className="card-head"><div><span className="brand-pill">{station.brand}</span><h3>{station.name}</h3><p>{station.distanceKm ? `${station.distanceKm.toFixed(1).replace('.', ',')} km · ` : ''}{station.rating ? `★ ${station.rating.toFixed(1)}` : 'Ainda não avaliado'}</p></div><div className="price"><small>{labels[fuel]}</small><strong>{price ? money(price.value) : '—'}</strong><span className={`confidence ${tone}`}>{price ? `${price.confidence}% confiança` : 'Sem preço'}</span></div></div>
    <div className="chips">{station.services.slice(0, 3).map((service) => <span key={service}>{service}</span>)}</div>
    <button className="text-button">Ver detalhes <span>→</span></button>
  </article>
}
