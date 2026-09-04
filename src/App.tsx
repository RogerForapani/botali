import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import './App.css'
import './forms.css'
import './components.css'
import { AddStationModal } from './components/AddStationModal'
import { AuthModal } from './components/AuthModal'
import { StationMap } from './components/StationMap'
import { StationCard } from './components/StationCard'
import { FlexRatioBadge } from './components/botali/FlexRatioBadge'
import { SegmentedControl } from './components/ui/SegmentedControl'
import { stations as demoStations } from './data/stations'
import { supabase } from './lib/supabase'
import { loadStations } from './services/stations'
import type { FuelCode, MapView, Station } from './types'
import { getEthanolGasolineRatio } from './utils/flexFuel'

const fuelLabels: Record<FuelCode, string> = { gasolina: 'Gasolina comum', etanol: 'Etanol', diesel_s10: 'Diesel S10' }
const mapViews: { value: MapView; label: string; icon?: string }[] = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'diesel_s10', label: 'Diesel' },
  { value: 'electric', label: 'Recarga', icon: '⚡' },
]

const hasElectricCharging = (station: Station) => station.services.some((service) => /recarga|elétric|eletric|\bev\b/i.test(service))

function App() {
  const [mapView, setMapView] = useState<MapView>('gasolina')
  const [radius, setRadius] = useState(10)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Station | null>(null)
  const [stations, setStations] = useState(demoStations)
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showAddStation, setShowAddStation] = useState(false)
  const [notice, setNotice] = useState('')
  const selectStation = useCallback((station: Station) => setSelected(station), [])
  const fuel: FuelCode = mapView === 'electric' ? 'gasolina' : mapView
  const filtered = useMemo(() => stations.filter((station) => station.distanceKm <= radius && `${station.name} ${station.brand} ${station.address}`.toLowerCase().includes(query.toLowerCase()) && (mapView !== 'electric' || hasElectricCharging(station))).sort((a, b) => a.distanceKm - b.distanceKm), [stations, radius, query, mapView])
  const selectedFlexRatio = selected ? getEthanolGasolineRatio(selected) : null

  const refreshStations = useCallback(async () => {
    try { const realStations = await loadStations(); if (realStations.length) setStations(realStations) }
    catch { setNotice('Não foi possível atualizar os postos agora. Exibindo dados de demonstração.') }
  }, [])

  useEffect(() => {
    let active = true
    loadStations().then((realStations) => { if (active && realStations.length) setStations(realStations) }).catch(() => { if (active) setNotice('Não foi possível atualizar os postos agora. Exibindo dados de demonstração.') })
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  function requestContribution(kind: 'station' | 'price') {
    if (!user) { setShowAuth(true); setNotice(kind === 'price' ? 'Entre para informar um preço.' : 'Entre para cadastrar um posto.'); return }
    if (kind === 'station') setShowAddStation(true)
    else setNotice('O envio de preços será liberado na próxima etapa.')
  }

  return <div className="app-shell">
    <header className="topbar"><div className="identity"><div className="logo">b</div><div><h1>botali</h1><p>O melhor posto tá ali.</p></div></div><button className="profile" onClick={() => user ? supabase?.auth.signOut() : setShowAuth(true)}><span>{user?.email?.[0].toUpperCase() ?? '○'}</span><div><b>{user ? 'Minha conta' : 'Entrar'}</b><small>{user ? 'Sair da conta' : 'Para contribuir'}</small></div></button></header>
    <main>
      <aside className="sidebar">
        <section className="filters"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Posto, bairro ou bandeira" /></label><SegmentedControl label="Informação exibida no mapa" value={mapView} options={mapViews} onChange={setMapView} /><div className="selects radius-select"><select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>{[2, 5, 10, 25, 50, 100].map((value) => <option key={value} value={value}>Até {value} km</option>)}</select></div><p className="map-view-hint">{mapView === 'electric' ? 'Mostrando somente postos com recarga elétrica.' : 'O percentual compara etanol com gasolina. Até 70% indica vantagem do etanol.'}</p></section>
        <section className="results-title"><div><small>PERTO DE VOCÊ</small><h2>Postos encontrados</h2></div><span>{filtered.length}</span></section>
        <div className="station-list">{filtered.length ? filtered.map((station) => <StationCard key={station.id} station={station} fuel={fuel} onSelect={() => selectStation(station)} />) : <div className="empty"><b>Nenhum posto encontrado</b><p>Aumente o raio ou tente outra busca.</p></div>}</div>
      </aside>
      <StationMap stations={filtered} view={mapView} onSelect={selectStation} />
    </main>
    <nav className="bottom-nav"><button className="active">⌖<span>Mapa</span></button><button>⌕<span>Explorar</span></button><button className="add" onClick={() => requestContribution('station')}>＋</button><button>◷<span>Atividade</span></button><button onClick={() => user ? undefined : setShowAuth(true)}>○<span>Perfil</span></button></nav>
    <button className="desktop-add" onClick={() => requestContribution('station')}>＋ Adicionar posto</button>
    {notice && <button className="toast" onClick={() => setNotice('')}>{notice}</button>}
    {selected && <><button className="scrim" onClick={() => setSelected(null)} aria-label="Fechar detalhes" /><aside className="details"><button className="close" onClick={() => setSelected(null)}>×</button><span className="eyebrow">{selected.brand}</span><h2>{selected.name}</h2><p>{selected.address}</p><div className="stats"><div><b>{selected.distanceKm ? `${selected.distanceKm.toFixed(1).replace('.', ',')} km` : '—'}</b><small>distância</small></div><div><b>{selected.rating ? `★ ${selected.rating}` : '—'}</b><small>avaliação</small></div><div><b>{selected.prices[fuel] ? `${selected.prices[fuel]?.confidence}%` : '—'}</b><small>confiança</small></div></div>{selectedFlexRatio && <div className="flex-comparison"><span>Comparação para carro flex</span><FlexRatioBadge percentage={selectedFlexRatio.percentage} favorable={selectedFlexRatio.favorable} /></div>}<h3>Preço da comunidade</h3>{selected.prices[fuel] ? <div className="community-price"><div><small>{fuelLabels[fuel]}</small><strong>{selected.prices[fuel]?.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><p>{selected.prices[fuel]?.confirmations} confirmações<br />Atualizado há {selected.prices[fuel]?.updatedMinutes} min</p></div> : <div className="empty-price">Ninguém informou este preço recentemente.<br /><b>Seja o primeiro a informar.</b></div>}<button className="primary" onClick={() => requestContribution('price')}>Informar novo preço</button><h3>Serviços</h3><div className="chips">{selected.services.length ? selected.services.map((service) => <span key={service}>{service}</span>) : <span>Nenhum serviço confirmado</span>}</div></aside></>}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    {showAddStation && user && <AddStationModal userId={user.id} onClose={() => setShowAddStation(false)} onCreated={() => { setShowAddStation(false); refreshStations(); setNotice('Posto cadastrado e aguardando verificação.') }} />}
  </div>
}

export default App
