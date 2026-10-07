import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

type Pending = { event_id: string; expo_push_token: string; station_id: string; station_name: string; fuel_code: string; price: number; latitude: number; longitude: number }
type Receipt = { event_id: string; ticket_id: string }
type ExpoResult = { status: 'ok' | 'error'; id?: string; message?: string; details?: { error?: string } }

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function reply(status: number, body: object) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (!supabaseUrl || !serviceKey) return reply(503, { error: 'Backend unavailable' })
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const candidate = request.headers.get('x-botali-alert-secret')
  if (!candidate) return reply(401, { error: 'Unauthorized' })

  const { data: authorized, error: authError } = await db.rpc('price_alert_dispatch_authorized', { candidate })
  if (authError || authorized !== true) return reply(401, { error: 'Unauthorized' })

  try {
    const { data: pending, error: pendingError } = await db.rpc('pending_price_alert_pushes', { batch_limit: 50 })
    if (pendingError) throw pendingError
    const alerts = (pending ?? []) as Pending[]
    if (alerts.length) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(alerts.map((alert) => ({
          to: alert.expo_push_token,
          channelId: 'price-alerts',
          title: 'Preço dentro do seu limite',
          body: `${alert.station_name}: ${alert.fuel_code} por R$ ${Number(alert.price).toFixed(2).replace('.', ',')}/L`,
          data: { kind: 'price-alert', stationId: alert.station_id, alertId: alert.event_id, latitude: alert.latitude, longitude: alert.longitude },
          sound: null,
        }))),
      })
      if (!response.ok) throw new Error(`Expo push send HTTP ${response.status}`)
      const payload = await response.json() as { data?: ExpoResult[]; errors?: unknown[] }
      if (!Array.isArray(payload.data) || payload.data.length !== alerts.length) throw new Error('Unexpected Expo push response')
      for (let index = 0; index < alerts.length; index++) {
        const result = payload.data[index]
        const { error } = await db.rpc('mark_price_alert_push_result', {
          alert_id: alerts[index].event_id,
          ticket_id: result.status === 'ok' ? result.id ?? null : null,
          error_code: result.details?.error ?? result.message ?? null,
        })
        if (error) throw error
      }
    }

    const { data: unchecked, error: receiptsError } = await db.rpc('unchecked_price_alert_receipts', { batch_limit: 50 })
    if (receiptsError) throw receiptsError
    const receipts = (unchecked ?? []) as Receipt[]
    if (receipts.length) {
      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ ids: receipts.map((item) => item.ticket_id) }),
      })
      if (!response.ok) throw new Error(`Expo push receipts HTTP ${response.status}`)
      const payload = await response.json() as { data?: Record<string, ExpoResult> }
      if (!payload.data) throw new Error('Unexpected Expo receipts response')
      for (const item of receipts) {
        const result = payload.data[item.ticket_id]
        if (!result) continue
        const { error } = await db.rpc('mark_price_alert_receipt', {
          alert_id: item.event_id,
          error_code: result.status === 'ok' ? null : result.details?.error ?? result.message ?? 'Unknown',
        })
        if (error) throw error
      }
    }
    return reply(200, { submitted: alerts.length, receiptsChecked: receipts.length })
  } catch (error) {
    console.error('Price alert dispatch failed', error)
    return reply(500, { error: 'Dispatch failed' })
  }
})
