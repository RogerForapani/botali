import { useEffect, useState, type FormEvent } from 'react'
import { createStation, getBrands } from '../services/stations'

type Brand = { id: string; name: string }

export function AddStationModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { getBrands().then((rows) => setBrands(rows as Brand[])).catch(() => setMessage('Não foi possível carregar as bandeiras.')) }, [])

  function locate() {
    setMessage('Localizando…')
    navigator.geolocation.getCurrentPosition(({ coords: position }) => { setCoords({ latitude: position.latitude, longitude: position.longitude }); setMessage('Localização adicionada.') }, () => setMessage('Não foi possível obter sua localização.'))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!coords) return setMessage('Adicione a localização do posto antes de continuar.')
    setBusy(true); setMessage('')
    try { await createStation({ name, brandId: brandId || null, address, userId, ...coords }); setMessage('Posto enviado para verificação.'); setTimeout(onCreated, 700) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar o posto.') }
    finally { setBusy(false) }
  }

  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="station-title"><button className="modal-scrim" onClick={onClose} aria-label="Fechar" /><div className="modal-card"><button className="close" onClick={onClose}>×</button><span className="eyebrow">NOVO POSTO</span><h2 id="station-title">Adicionar ao mapa</h2><p>O cadastro ficará identificado como “ainda não verificado” até receber confirmações.</p><form onSubmit={submit}><label>Nome do posto<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required /></label><label>Bandeira<select value={brandId} onChange={(e) => setBrandId(e.target.value)}><option value="">Sem bandeira definida</option>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label><label>Endereço<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro e cidade" /></label><button type="button" className="location-field" onClick={locate}>{coords ? `✓ ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : '⌖ Usar minha localização atual'}</button>{message && <div className="form-message">{message}</div>}<button className="primary" disabled={busy}>{busy ? 'Enviando…' : 'Cadastrar posto'}</button></form></div></div>
}
