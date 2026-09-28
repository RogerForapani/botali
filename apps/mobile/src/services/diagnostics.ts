import AsyncStorage from '@react-native-async-storage/async-storage'
import { diagnosticForError } from '../utils/appError'

const DIAGNOSTICS_KEY = '@botali/diagnostics/v1'
const METRICS_KEY = '@botali/metrics/v1'
const MAX_ENTRIES = 20
const MAX_METRICS = 20
const MAX_SAMPLES = 20

export type AppDiagnostic = ReturnType<typeof diagnosticForError>

type StoredAppMetric = {
  context: string
  count: number
  failureCount: number
  totalDurationMs: number
  maxDurationMs: number
  lastDurationMs: number
  lastOccurredAt: string
  recentDurationsMs: number[]
}

export type AppMetric = Omit<StoredAppMetric, 'recentDurationsMs'> & {
  averageDurationMs: number
  p95DurationMs: number
  successRate: number
}

let metricsWriteQueue: Promise<void> = Promise.resolve()

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

export function recordAppMetric(context: string, durationMs: number, success: boolean) {
  const safeContext = context.replace(/[^a-z0-9.-]/gi, '').slice(0, 64) || 'unknown'
  const safeDuration = Math.max(0, Math.min(Math.round(durationMs), 120_000))

  metricsWriteQueue = metricsWriteQueue.then(async () => {
    const raw = await AsyncStorage.getItem(METRICS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const current = Array.isArray(parsed) ? parsed.filter(isStoredMetric) : []
    const previous = current.find((metric) => metric.context === safeContext)
    const next: StoredAppMetric = {
      context: safeContext,
      count: (previous?.count ?? 0) + 1,
      failureCount: (previous?.failureCount ?? 0) + (success ? 0 : 1),
      totalDurationMs: (previous?.totalDurationMs ?? 0) + safeDuration,
      maxDurationMs: Math.max(previous?.maxDurationMs ?? 0, safeDuration),
      lastDurationMs: safeDuration,
      lastOccurredAt: new Date().toISOString(),
      recentDurationsMs: [...(previous?.recentDurationsMs ?? []), safeDuration].slice(-MAX_SAMPLES),
    }
    const metrics = [next, ...current.filter((metric) => metric.context !== safeContext)].slice(0, MAX_METRICS)
    await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(metrics))
  }).catch(() => undefined)

  return metricsWriteQueue
}

export async function loadAppMetrics(): Promise<AppMetric[]> {
  await metricsWriteQueue
  try {
    const raw = await AsyncStorage.getItem(METRICS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredMetric).slice(0, MAX_METRICS).map(summarizeMetric)
  } catch {
    return []
  }
}

export async function observeAppOperation<T>(context: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = Date.now()
  try {
    const result = await operation()
    recordAppMetric(context, Date.now() - startedAt, true).catch(() => undefined)
    return result
  } catch (error) {
    recordAppMetric(context, Date.now() - startedAt, false).catch(() => undefined)
    throw error
  }
}

function summarizeMetric(metric: StoredAppMetric): AppMetric {
  const samples = [...metric.recentDurationsMs].sort((left, right) => left - right)
  const p95Index = Math.max(0, Math.ceil(samples.length * 0.95) - 1)
  return {
    context: metric.context,
    count: metric.count,
    failureCount: metric.failureCount,
    totalDurationMs: metric.totalDurationMs,
    maxDurationMs: metric.maxDurationMs,
    lastDurationMs: metric.lastDurationMs,
    lastOccurredAt: metric.lastOccurredAt,
    averageDurationMs: Math.round(metric.totalDurationMs / metric.count),
    p95DurationMs: samples[p95Index] ?? 0,
    successRate: Math.round(((metric.count - metric.failureCount) / metric.count) * 1000) / 10,
  }
}

function isStoredMetric(value: unknown): value is StoredAppMetric {
  if (!value || typeof value !== 'object') return false
  const metric = value as Partial<StoredAppMetric>
  return typeof metric.context === 'string'
    && typeof metric.count === 'number' && metric.count > 0
    && typeof metric.failureCount === 'number'
    && typeof metric.totalDurationMs === 'number'
    && typeof metric.maxDurationMs === 'number'
    && typeof metric.lastDurationMs === 'number'
    && typeof metric.lastOccurredAt === 'string'
    && Array.isArray(metric.recentDurationsMs)
}
