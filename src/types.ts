export type FuelCode = 'gasolina' | 'etanol' | 'diesel_s10'
export type MapView = FuelCode | 'electric'

export interface Station {
  id: string
  name: string
  brand: string
  latitude: number
  longitude: number
  address: string
  distanceKm: number
  rating: number
  services: string[]
  prices: Partial<Record<FuelCode, { submissionId?: string; value: number; confidence: number; confirmations: number; reports?: number; updatedMinutes: number }>>
}
