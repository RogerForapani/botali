export type FuelCode = 'gasolina' | 'gasolina_aditivada' | 'gasolina_premium' | 'etanol' | 'etanol_aditivado' | 'diesel_s10' | 'diesel_s10_aditivado' | 'diesel_s500' | 'diesel_s500_aditivado' | 'gnv'
export type MapMode = FuelCode | 'electric'
export interface FuelPrice { value: number; confidence: number; reports?: number; updatedAt?: string }
export interface Station { id: string; name: string; brand: string; address?: string; latitude: number; longitude: number; distanceKm: number; rating: number; hasElectricCharging: boolean; services?: string[]; fuelCodes?: FuelCode[]; prices: Partial<Record<FuelCode, FuelPrice>> }
