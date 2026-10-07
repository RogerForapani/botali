import { useEffect, useState } from 'react'
import { loadVehicle, removeVehicle, saveVehicle } from '../services/vehicle'
import { recordAppFailure } from '../services/diagnostics'
import type { Vehicle } from '../utils/vehicle'

export function useVehicle(userId: string | null) {
  const [loaded, setLoaded] = useState<{ userId: string; vehicle: Vehicle | null } | null>(null)

  useEffect(() => {
    let active = true
    if (userId) {
      loadVehicle(userId)
        .then((saved) => { if (active) setLoaded({ userId, vehicle: saved }) })
        .catch((error) => { recordAppFailure('vehicle.load', error).catch(() => undefined); if (active) setLoaded({ userId, vehicle: null }) })
    }
    return () => { active = false }
  }, [userId])

  async function update(next: Vehicle | null) {
    if (!userId) throw new Error('Entre na sua conta para salvar o veículo.')
    if (next) await saveVehicle(userId, next)
    else await removeVehicle(userId)
    setLoaded({ userId, vehicle: next })
  }

  return { vehicle: userId && loaded?.userId === userId ? loaded.vehicle : null, loading: Boolean(userId && loaded?.userId !== userId), update }
}
