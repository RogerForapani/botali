import { useState } from 'react'
import { checkInStation, confirmPriceAtStation } from '../services/stations'
import type { FuelCode, Station } from '../types'

interface Props {
  station: Station
  fuel: FuelCode
  authenticated: boolean
  onRequireAuth: () => void
  onUpdated: () => void
}

function currentLocation() {
  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Seu navegador não oferece localização.'))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Não foi possível validar sua localização. Confira a permissão do GPS.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  })
}

export function StationPresenceActions({ station, fuel, authenticated, onRequireAuth, onUpdated }: Props) {
  const [busy, setBusy] = useState<'visit' | 'confirm' | null>(null)
  const [message, setMessage] = useState('')
  const price = station.prices[fuel]

  async function run(kind: 'visit' | 'confirm') {
    if (!authenticated) return onRequireAuth()
    setBusy(kind)
    setMessage('Validando sua proximidade…')
    try {
      const coords = await currentLocation()
      const distance = kind === 'confirm' && price?.submissionId
        ? await confirmPriceAtStation(price.submissionId, coords)
        : await checkInStation(station.id, coords)
      setMessage(kind === 'confirm' ? `Preço confirmado a ${distance} m do posto. Valeu!` : `Presença registrada a ${distance} m do posto.`)
      onUpdated()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível validar sua presença.')
    } finally {
      setBusy(null)
    }
  }

  return <section className="presence-card" aria-labelledby="presence-title">
    <div><span className="eyebrow">PRESENÇA VERIFICADA</span><h3 id="presence-title">Você está neste posto?</h3></div>
    <p>O GPS é usado uma vez para validar até 200 m. Guardamos o posto, o dia e a distância aproximada — não sua coordenada exata.</p>
    <div className="presence-actions">
      <button className="secondary-action" disabled={busy !== null} onClick={() => run('visit')}>{busy === 'visit' ? 'Validando…' : 'Estou neste posto'}</button>
      {price?.submissionId && <button className="primary compact" disabled={busy !== null} onClick={() => run('confirm')}>{busy === 'confirm' ? 'Confirmando…' : `Confirmar R$ ${price.value.toFixed(2).replace('.', ',')}`}</button>}
    </div>
    {message && <div className="form-message" role="status">{message}</div>}
  </section>
}
