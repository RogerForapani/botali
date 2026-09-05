import type { Station } from '../types'

export const stations: Station[] = [
  { id: '1', name: 'Posto Via Norte', brand: 'Shell', latitude: -20.0247, longitude: -44.0562, distanceKm: 1.2, rating: 4.7, hasElectricCharging: false, prices: { gasolina: { value: 5.89, confidence: 94 }, etanol: { value: 3.89, confidence: 86 }, diesel_s10: { value: 6.09, confidence: 78 } } },
  { id: '2', name: 'Posto Serra Azul', brand: 'Ipiranga', latitude: -20.0172, longitude: -44.048, distanceKm: 2.4, rating: 4.4, hasElectricCharging: false, prices: { gasolina: { value: 5.84, confidence: 87 }, etanol: { value: 3.85, confidence: 84 }, diesel_s10: { value: 6.19, confidence: 61 } } },
  { id: '3', name: 'Auto Posto Horizonte', brand: 'Ale', latitude: -20.0356, longitude: -44.066, distanceKm: 3.6, rating: 4.8, hasElectricCharging: true, prices: { gasolina: { value: 5.92, confidence: 97 }, etanol: { value: 3.79, confidence: 95 }, diesel_s10: { value: 5.99, confidence: 91 } } },
]
