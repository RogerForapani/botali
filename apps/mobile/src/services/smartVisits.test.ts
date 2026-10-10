import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasStartedGeofencingAsync: vi.fn(),
  stopGeofencingAsync: vi.fn(),
  getAllKeys: vi.fn(),
  multiRemove: vi.fn(),
  defineTask: vi.fn(),
}))

vi.mock('expo-location', () => ({
  hasStartedGeofencingAsync: mocks.hasStartedGeofencingAsync,
  stopGeofencingAsync: mocks.stopGeofencingAsync,
}))
vi.mock('expo-task-manager', () => ({ defineTask: mocks.defineTask }))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getAllKeys: mocks.getAllKeys, multiRemove: mocks.multiRemove },
}))

describe('desativação de visitas automáticas antigas', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.hasStartedGeofencingAsync.mockReset()
    mocks.stopGeofencingAsync.mockReset()
    mocks.getAllKeys.mockReset()
    mocks.multiRemove.mockReset()
    mocks.hasStartedGeofencingAsync.mockResolvedValue(false)
    mocks.stopGeofencingAsync.mockResolvedValue(undefined)
    mocks.getAllKeys.mockResolvedValue(['botali:visit:enter:posto', 'botali:prompt:last', 'botali:favorites:guest'])
    mocks.multiRemove.mockResolvedValue(undefined)
  })

  it('não processa mais eventos antigos de geofence', async () => {
    await import('./smartVisits')
    expect(mocks.defineTask).toHaveBeenCalledWith('botali-smart-visits', expect.any(Function))
    const handler = mocks.defineTask.mock.calls[0][1]
    await expect(handler({ data: { region: { identifier: 'posto' } } })).resolves.toBeUndefined()
  })

  it('remove geofence e dados locais antigos, preservando favoritos', async () => {
    const { disableSmartVisits } = await import('./smartVisits')
    mocks.hasStartedGeofencingAsync.mockResolvedValue(true)
    await disableSmartVisits()
    expect(mocks.stopGeofencingAsync).toHaveBeenCalledWith('botali-smart-visits')
    expect(mocks.multiRemove).toHaveBeenCalledWith([
      'botali:smart-visits:enabled', 'botali:smart-visits:stations',
      'botali:visit:enter:posto', 'botali:prompt:last',
    ])
  })

  it('limpa o estado local mesmo se a parada da geofence falhar', async () => {
    const { disableSmartVisits } = await import('./smartVisits')
    mocks.hasStartedGeofencingAsync.mockResolvedValue(true)
    mocks.stopGeofencingAsync.mockRejectedValue(new Error('falha nativa'))
    await expect(disableSmartVisits()).rejects.toThrow('falha nativa')
    expect(mocks.multiRemove).toHaveBeenCalled()
  })
})
