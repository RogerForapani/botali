import { describe, expect, it } from 'vitest'
import { isStationId } from './stationId'

describe('isStationId', () => {
  it('accepts a conventional station UUID', () => {
    expect(isStationId('28a3d714-5fc7-2772-94b5-a96e0d447ebb')).toBe(true)
  })

  it('accepts a restored synthetic station UUID without RFC variant bits', () => {
    expect(isStationId('6ed33b88-f10b-7678-7736-1ac8d17dd821')).toBe(true)
  })

  it('rejects malformed station IDs', () => {
    expect(isStationId('')).toBe(false)
    expect(isStationId('6ed33b88-f10b-7678-7736-1ac8d17dd82')).toBe(false)
    expect(isStationId('6ed33b88-f10b-7678-7736-1ac8d17dd82z')).toBe(false)
  })
})
