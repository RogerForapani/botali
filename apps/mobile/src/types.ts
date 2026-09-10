export type FuelCode = string
export type MapMode = FuelCode | 'electric'
export interface FuelPrice { value: number; confidence: number; reports?: number; confirmations?: number; disagreements?: number; updatedAt?: string; submissionId?: string }
export interface Station { id: string; name: string; brand: string; status?: 'pending' | 'verified'; address?: string; latitude: number; longitude: number; distanceKm: number; rating: number; hasElectricCharging: boolean; services?: string[]; serviceCodes?: string[]; fuelCodes?: FuelCode[]; prices: Partial<Record<FuelCode, FuelPrice>> }
