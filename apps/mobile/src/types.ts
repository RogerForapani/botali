export type FuelCode = 'gasolina' | 'etanol' | 'diesel_s10'
export type MapMode = FuelCode | 'electric'
export interface FuelPrice { value: number; confidence: number }
export interface Station { id: string; name: string; brand: string; latitude: number; longitude: number; distanceKm: number; rating: number; hasElectricCharging: boolean; prices: Partial<Record<FuelCode, FuelPrice>> }
