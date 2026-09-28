import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createClient } from '@supabase/supabase-js'

const options = parseOptions(process.argv.slice(2))
loadLocalEnvironment(resolve('apps/mobile/.env.local'))

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY em apps/mobile/.env.local.')

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const scenarios = [
  { name: 'mapa-ibirite', kind: 'bounds', north: -19.9847, south: -20.0647, east: -44.0162, west: -44.0962 },
  { name: 'mapa-belo-horizonte', kind: 'bounds', north: -19.875, south: -19.975, east: -43.89, west: -44.01 },
  { name: 'mapa-contagem', kind: 'bounds', north: -19.88, south: -20.01, east: -44.00, west: -44.16 },
  { name: 'raio-10-km', kind: 'radius', latitude: -19.9167, longitude: -43.9345, radiusKm: 10 },
  { name: 'raio-25-km', kind: 'radius', latitude: -19.9167, longitude: -43.9345, radiusKm: 25 },
  { name: 'raio-100-km', kind: 'radius', latitude: -19.9167, longitude: -43.9345, radiusKm: 100 },
]

console.log(`Aquecendo ${scenarios.length} cenários...`)
for (const scenario of scenarios) await executeScenario(scenario)

const jobs = Array.from({ length: options.requests }, (_, index) => ({ index, scenario: scenarios[index % scenarios.length] }))
const results = []
let cursor = 0

await Promise.all(Array.from({ length: options.concurrency }, async () => {
  while (cursor < jobs.length) {
    const job = jobs[cursor++]
    try {
      results.push(await executeScenario(job.scenario))
    } catch (error) {
      results.push({ scenario: job.scenario.name, error: error instanceof Error ? error.message : String(error) })
    }
  }
}))

const successful = results.filter((result) => !result.error)
const failures = results.filter((result) => result.error)
const summary = summarize(successful)

console.table(summary.map((row) => ({
  cenário: row.scenario,
  amostras: row.samples,
  'postos médios': row.averageStations,
  'p50 total (ms)': row.p50,
  'p95 total (ms)': row.p95,
  'p95 geográfico (ms)': row.spatialP95,
  'p95 complementos (ms)': row.hydrationP95,
  'máximo (ms)': row.max,
})))

const overallP95 = percentile(successful.map((result) => result.totalMs), .95)
const failureRate = results.length ? failures.length / results.length : 1
console.log(JSON.stringify({
  requests: results.length,
  concurrency: options.concurrency,
  successful: successful.length,
  failures: failures.length,
  failureRate: Number((failureRate * 100).toFixed(2)),
  overallP95Ms: overallP95,
  targetP95Ms: options.targetP95Ms,
}, null, 2))

if (failures.length) console.error('Primeiros erros:', failures.slice(0, 3))
if (failures.length || overallP95 > options.targetP95Ms) process.exitCode = 1

async function executeScenario(scenario) {
  const startedAt = performance.now()
  const spatialStartedAt = performance.now()
  const spatialResult = scenario.kind === 'bounds'
    ? await supabase.rpc('stations_in_map_bounds_v1', {
      north_lat: scenario.north,
      south_lat: scenario.south,
      east_long: scenario.east,
      west_long: scenario.west,
      result_limit: 200,
      result_offset: 0,
    })
    : await supabase.rpc('nearby_stations_v3', {
      lat: scenario.latitude,
      long: scenario.longitude,
      radius_m: scenario.radiusKm * 1000,
      result_limit: 200,
      result_offset: 0,
    })
  if (spatialResult.error) throw spatialResult.error

  const spatialMs = performance.now() - spatialStartedAt
  const stationIds = (spatialResult.data ?? []).map((station) => station.id)
  const hydrationStartedAt = performance.now()
  if (stationIds.length) {
    const [prices, services, fuels] = await Promise.all([
      supabase.rpc('community_prices_for_stations', { target_station_ids: stationIds }),
      supabase.from('station_services').select('station_id,services(code,name)').in('station_id', stationIds).eq('status', 'confirmed'),
      supabase.from('station_fuels').select('station_id,fuel_types(code)').in('station_id', stationIds),
    ])
    for (const result of [prices, services, fuels]) if (result.error) throw result.error
  }

  return {
    scenario: scenario.name,
    stationCount: stationIds.length,
    spatialMs,
    hydrationMs: performance.now() - hydrationStartedAt,
    totalMs: performance.now() - startedAt,
  }
}

function summarize(rows) {
  const groups = Map.groupBy(rows, (row) => row.scenario)
  return [...groups.entries()].map(([scenario, samples]) => ({
    scenario,
    samples: samples.length,
    averageStations: Math.round(samples.reduce((sum, row) => sum + row.stationCount, 0) / samples.length),
    p50: percentile(samples.map((row) => row.totalMs), .5),
    p95: percentile(samples.map((row) => row.totalMs), .95),
    spatialP95: percentile(samples.map((row) => row.spatialMs), .95),
    hydrationP95: percentile(samples.map((row) => row.hydrationMs), .95),
    max: Math.round(Math.max(...samples.map((row) => row.totalMs))),
  })).sort((left, right) => left.scenario.localeCompare(right.scenario))
}

function percentile(values, quantile) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return Math.round(sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)])
}

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => {
    const [key, value] = argument.replace(/^--/, '').split('=')
    return [key, Number(value)]
  }))
  return {
    requests: positiveInteger(values.requests, 60),
    concurrency: positiveInteger(values.concurrency, 5),
    targetP95Ms: positiveInteger(values['target-p95-ms'], 2500),
  }
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function loadLocalEnvironment(path) {
  let content
  try { content = readFileSync(path, 'utf8') } catch { return }
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}
