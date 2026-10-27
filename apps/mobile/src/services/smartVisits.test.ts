import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAllKeys: vi.fn(),
  multiRemove: vi.fn(),
  defineTask: vi.fn(),
}))

vi.mock('expo-task-manager', () => ({ defineTask: mocks.defineTask }))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getAllKeys: mocks.getAllKeys, multiRemove: mocks.multiRemove },
}))

describe('desativação de visitas automáticas antigas', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getAllKeys.mockReset()
    mocks.multiRemove.mockReset()
    mocks.getAllKeys.mockResolvedValue(['botali:visit:enter:posto', 'botali:prompt:last', 'botali:favorites:guest'])
    mocks.multiRemove.mockResolvedValue(undefined)
  })

  it('não processa mais eventos antigos de geofence', async () => {
    await import('./smartVisits')
    expect(mocks.defineTask).toHaveBeenCalledWith('botali-smart-visits', expect.any(Function))
    const handler = mocks.defineTask.mock.calls[0][1]
    await expect(handler({ data: { region: { identifier: 'posto' } } })).resolves.toBeUndefined()
  })

  it('remove dados locais antigos, preservando favoritos', async () => {
    const { disableSmartVisits } = await import('./smartVisits')
    await disableSmartVisits()
    expect(mocks.multiRemove).toHaveBeenCalledWith([
      'botali:smart-visits:enabled', 'botali:smart-visits:stations',
      'botali:visit:enter:posto', 'botali:prompt:last',
    ])
  })
})
