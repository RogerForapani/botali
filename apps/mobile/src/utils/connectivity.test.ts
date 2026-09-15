import { describe, expect, it } from 'vitest'
import { isNetworkAvailable } from './connectivity'

describe('estado de conexão', () => {
  it('considera offline quando a rede ou a internet não estão disponíveis', () => {
    expect(isNetworkAvailable({ isConnected: false, isInternetReachable: null })).toBe(false)
    expect(isNetworkAvailable({ isConnected: true, isInternetReachable: false })).toBe(false)
  })

  it('não marca como offline enquanto a verificação da internet está indefinida', () => {
    expect(isNetworkAvailable({ isConnected: true, isInternetReachable: null })).toBe(true)
  })
})
