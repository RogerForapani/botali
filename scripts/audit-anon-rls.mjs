const expectedHost = 'phsvoeljsaksglqrpstm.supabase.co'
const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!baseUrl || !apiKey) throw new Error('Variáveis públicas do Supabase ausentes.')
if (new URL(baseUrl).hostname !== expectedHost) throw new Error('A auditoria só pode executar na homologação.')

const headers = { apikey: apiKey, Authorization: `Bearer ${apiKey}` }

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

const [verified, pending, profiles, prices, moderation] = await Promise.all([
  request('stations?select=id&status=eq.verified&limit=1'),
  request('stations?select=id&status=eq.pending&limit=1'),
  request('profiles?select=id&limit=1'),
  request('price_submissions?select=id&limit=1'),
  request('rpc/moderate_station', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_station_id: '00000000-0000-0000-0000-000000000000', decision: 'verified' }),
  }),
])

const results = {
  verifiedVisible: verified.status === 200 && Array.isArray(verified.body) && verified.body.length === 1,
  pendingHidden: pending.status === 200 && Array.isArray(pending.body) && pending.body.length === 0,
  profilesDenied: [401, 403, 404].includes(profiles.status),
  rawPricesDenied: [401, 403, 404].includes(prices.status),
  moderationDenied: [401, 403, 404].includes(moderation.status),
}

for (const [name, passed] of Object.entries(results)) console.log(`${name}: ${passed ? 'PASS' : 'FAIL'}`)
console.log('HTTP status:', {
  verified: verified.status,
  pending: pending.status,
  profiles: profiles.status,
  prices: prices.status,
  moderation: moderation.status,
})
if (Object.values(results).some((passed) => !passed)) {
  process.exitCode = 1
}
