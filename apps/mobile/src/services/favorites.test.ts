import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadFavorites, toggleFavorite } from './favorites'

const storage = new Map<string, string>()
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value) }),
  },
}))

describe('favoritos locais', () => {
  beforeEach(() => storage.clear())

  it('separa cada conta e o visitante no mesmo aparelho', async () => {
    await toggleFavorite('pessoa-a', 'posto-a')
    await toggleFavorite('pessoa-b', 'posto-b')
    await toggleFavorite(null, 'posto-visitante')

    expect(await loadFavorites('pessoa-a')).toEqual(['posto-a'])
    expect(await loadFavorites('pessoa-b')).toEqual(['posto-b'])
    expect(await loadFavorites(null)).toEqual(['posto-visitante'])
  })

  it('preserva a lista antiga apenas para o visitante, sem atribuí-la a uma conta', async () => {
    storage.set('botali:favorites', JSON.stringify(['posto-antigo']))

    expect(await loadFavorites('pessoa-a')).toEqual([])
    expect(await loadFavorites(null)).toEqual(['posto-antigo'])
    expect(storage.get('botali:favorites:guest')).toBe(JSON.stringify(['posto-antigo']))
    expect(storage.get('botali:favorites')).toBe(JSON.stringify(['posto-antigo']))
  })

  it('não reimporta a lista antiga após o visitante alterar seus favoritos', async () => {
    storage.set('botali:favorites', JSON.stringify(['posto-antigo']))
    await loadFavorites(null)
    await toggleFavorite(null, 'posto-antigo')
    expect(await loadFavorites(null)).toEqual([])
  })

  it('serializa toques rápidos e ignora conteúdo inválido', async () => {
    storage.set('botali:favorites:user:pessoa-a', '{quebrado')
    await Promise.all([toggleFavorite('pessoa-a', 'posto-a'), toggleFavorite('pessoa-a', 'posto-b')])
    expect(await loadFavorites('pessoa-a')).toEqual(['posto-a', 'posto-b'])
    storage.set('botali:favorites:user:pessoa-b', JSON.stringify(['posto-a', null, 'posto-a', 1]))
    expect(await loadFavorites('pessoa-b')).toEqual(['posto-a'])
  })
})
