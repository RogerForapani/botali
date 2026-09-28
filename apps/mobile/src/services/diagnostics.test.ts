import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value) }),
  },
}))

import { loadAppMetrics, observeAppOperation, recordAppMetric } from './diagnostics'

describe('métricas locais do aplicativo', () => {
  beforeEach(() => storage.clear())

  it('agrega duração, sucesso e p95 sem guardar argumentos da busca', async () => {
    await recordAppMetric('stations.bounds.first-page', 100, true)
    await recordAppMetric('stations.bounds.first-page', 300, false)

    const [metric] = await loadAppMetrics()
    expect(metric).toMatchObject({
      context: 'stations.bounds.first-page',
      count: 2,
      failureCount: 1,
      averageDurationMs: 200,
      p95DurationMs: 300,
      successRate: 50,
    })
    expect(JSON.stringify(metric)).not.toContain('latitude')
    expect(JSON.stringify(metric)).not.toContain('longitude')
  })

  it('registra falha e preserva o erro da operação observada', async () => {
    await expect(observeAppOperation('stations.radius.first-page', async () => {
      throw new Error('offline')
    })).rejects.toThrow('offline')

    const [metric] = await loadAppMetrics()
    expect(metric.count).toBe(1)
    expect(metric.failureCount).toBe(1)
  })
})
