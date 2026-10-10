import * as Crypto from 'expo-crypto'
import * as Updates from 'expo-updates'
import { supabase } from '../lib/supabase'

const homologationHost = 'phsvoeljsaksglqrpstm.supabase.co'

export const permissionAuditAvailable = Updates.channel === 'preview'
  && process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '') === homologationHost

type Check = { label: string; passed: boolean }
export type PermissionAudit = { accountType: string; checks: Check[] }

export async function runPermissionAudit(expectedUserId: string): Promise<PermissionAudit> {
  if (!permissionAuditAvailable || !supabase) throw new Error('Auditoria disponível somente na homologação.')

  const { data: identity, error: identityError } = await supabase.auth.getUser()
  if (identityError || !identity.user || identity.user.id !== expectedUserId) throw new Error('Sessão inválida. Entre novamente.')

  const roleResult = await supabase.from('user_roles').select('role').eq('user_id', expectedUserId).maybeSingle()
  if (roleResult.error || !roleResult.data) throw new Error('Não foi possível verificar o papel da conta.')
  const isModerator = roleResult.data.role === 'moderator' || roleResult.data.role === 'admin'
  const missingStationId = Crypto.randomUUID()
  const missingEditId = Crypto.randomUUID()

  const [profiles, otherPrices, otherEdits, missingStation, missingEdit] = await Promise.all([
    supabase.from('profiles').select('id').limit(20),
    supabase.from('price_submissions').select('user_id').neq('user_id', expectedUserId).limit(1),
    supabase.from('station_edit_requests').select('user_id').neq('user_id', expectedUserId).limit(1),
    supabase.from('stations').select('id').eq('id', missingStationId).maybeSingle(),
    supabase.from('station_edit_requests').select('id').eq('id', missingEditId).maybeSingle(),
  ])
  if (profiles.error || otherPrices.error || otherEdits.error || missingStation.error || missingEdit.error) throw new Error('Não foi possível completar as leituras de permissão.')
  if (missingStation.data || missingEdit.data) throw new Error('Identificador reservado para o teste está ocupado.')

  // O identificador acima não pertence a nenhum posto; as chamadas verificam a autorização sem alterar dados.
  const [stationModeration, editModeration] = await Promise.all([
    supabase.rpc('moderate_station', { target_station_id: missingStationId, decision: 'verified' }),
    supabase.rpc('moderate_station_edit_request', { target_request_id: missingEditId, decision: 'approved' }),
  ])

  const expectedModerationError = isModerator ? 'Pending' : 'Moderator access required'
  const checks: Check[] = [
    { label: 'Sessão e papel da conta', passed: true },
    { label: 'Acesso a perfis de outras contas', passed: isModerator
      ? (profiles.data ?? []).some((profile) => profile.id !== expectedUserId)
      : (profiles.data ?? []).length === 1 && profiles.data?.[0]?.id === expectedUserId },
    { label: 'Acesso a preços enviados por outros', passed: isModerator
      ? (otherPrices.data ?? []).length > 0
      : (otherPrices.data ?? []).length === 0 },
    { label: 'Acesso a correções enviadas por outros', passed: isModerator
      ? (otherEdits.data ?? []).length > 0
      : (otherEdits.data ?? []).length === 0 },
    { label: 'Autorização para moderar postos', passed: stationModeration.error?.message.includes(expectedModerationError) ?? false },
    { label: 'Autorização para moderar correções', passed: editModeration.error?.message.includes(expectedModerationError) ?? false },
  ]

  return { accountType: isModerator ? 'Moderador' : 'Usuário comum', checks }
}
