import { useState, type FormEvent } from 'react'
import { createPriceSubmission } from '../services/stations'
import type { FuelCode, Station } from '../types'

const fuelLabels: Record<FuelCode, string> = {
  gasolina: 'Gasolina comum',
  etanol: 'Etanol',
  diesel_s10: 'Diesel S10',
}

interface Props {
  station: Station
  initialFuel: FuelCode
  userId: string
  onClose: () => void
  onCreated: () => void
}

export function PriceSubmissionModal({ station, initialFuel, userId, onClose, onCreated }: Props) {
  const [fuel, setFuel] = useState(initialFuel)
  const [price, setPrice] = useState('')
  const [includeLocation, setIncludeLocation] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const numericPrice = Number(price.replace(',', '.'))
    if (!Number.isFinite(numericPrice) || numericPrice < 0.5 || numericPrice > 30) {
      setMessage('Informe um preço entre R$ 0,50 e R$ 30,00.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      let coords: { latitude: number; longitude: number } | null = null
      if (includeLocation) {
        coords = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
          ({ coords: position }) => resolve({ latitude: position.latitude, longitude: position.longitude }),
          () => reject(new Error('Não foi possível obter sua localização. Você pode desmarcar essa opção.')),
        ))
      }
      await createPriceSubmission({ stationId: station.id, fuel, price: numericPrice, userId, coords })
      setMessage('Preço enviado! Valeu pela ajuda.')
      setTimeout(onCreated, 700)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o preço.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="price-title">
    <button className="modal-scrim" onClick={onClose} aria-label="Fechar" />
    <div className="modal-card">
      <button className="close" onClick={onClose}>×</button>
      <span className="eyebrow">PREÇO DA COMUNIDADE</span>
      <h2 id="price-title">Quanto está no {station.name}?</h2>
      <p>Informe o valor exibido na bomba. Foto não é obrigatória.</p>
      <form onSubmit={submit}>
        <label>Combustível<select value={fuel} onChange={(event) => setFuel(event.target.value as FuelCode)}>{Object.entries(fuelLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label>Preço por litro<div className="money-input"><span>R$</span><input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="5,89" autoFocus required /></div></label>
        <label className="location-consent"><input type="checkbox" checked={includeLocation} onChange={(event) => setIncludeLocation(event.target.checked)} /><span>Usar minha localização para aumentar a confiança</span></label>
        {message && <div className="form-message" role="status">{message}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Enviando…' : 'Confirmar preço'}</button>
      </form>
    </div>
  </div>
}
