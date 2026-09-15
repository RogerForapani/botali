import AsyncStorage from '@react-native-async-storage/async-storage'
import { diagnosticForError } from '../utils/appError'

const DIAGNOSTICS_KEY = '@botali/diagnostics/v1'
const MAX_ENTRIES = 20

export type AppDiagnostic = ReturnType<typeof diagnosticForError>

export async function recordAppFailure(context: string, error: unknown) {
  const entry = diagnosticForError(context, error)
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTICS_KEY)
    const current = raw ? JSON.parse(raw) : []
    const entries = Array.isArray(current) ? current : []
    await AsyncStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify([entry, ...entries].slice(0, MAX_ENTRIES)))
  } catch {
    // Diagnostics must never interrupt the driver experience.
  }
}

export async function loadAppDiagnostics(): Promise<AppDiagnostic[]> {
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTICS_KEY)
    const entries = raw ? JSON.parse(raw) : []
    return Array.isArray(entries) ? entries.slice(0, MAX_ENTRIES) as AppDiagnostic[] : []
  } catch {
    return []
  }
}
