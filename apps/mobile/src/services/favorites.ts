import AsyncStorage from '@react-native-async-storage/async-storage'

const LEGACY_KEY = 'botali:favorites'
const GUEST_KEY = 'botali:favorites:guest'
const USER_PREFIX = 'botali:favorites:user:'

const pending = new Map<string, Promise<string[]>>()

export function favoritesKey(userId: string | null) {
  return userId ? `${USER_PREFIX}${userId}` : GUEST_KEY
}

function parseFavorites(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]
  } catch {
    return []
  }
}

export async function loadFavorites(userId: string | null): Promise<string[]> {
  const key = favoritesKey(userId)
  const saved = await AsyncStorage.getItem(key)
  if (saved !== null || userId) return parseFavorites(saved)

  // A lista antiga não tinha dono conhecido. Ela fica acessível só ao visitante.
  const legacy = parseFavorites(await AsyncStorage.getItem(LEGACY_KEY))
  await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(legacy))
  return legacy
}

export async function toggleFavorite(userId: string | null, id: string): Promise<string[]> {
  const key = favoritesKey(userId)
  const previous = pending.get(key)
  const operation = (previous ? previous.then(() => loadFavorites(userId), () => loadFavorites(userId)) : loadFavorites(userId))
    .then(async (current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      await AsyncStorage.setItem(key, JSON.stringify(next))
      return next
    })
  pending.set(key, operation)
  try {
    return await operation
  } finally {
    if (pending.get(key) === operation) pending.delete(key)
  }
}

export async function removeFavorites(userId: string): Promise<void> {
  if (!userId.trim()) throw new Error('Identificador da conta inválido.')
  const key = `${USER_PREFIX}${userId}`
  // A previous tap must finish before deleting this account's local list.
  await pending.get(key)?.catch(() => undefined)
  await AsyncStorage.removeItem(key)
}
