import { supabase } from '../lib/supabase'

export type CommunityProfile = {
  displayName: string
  avatarUrl: string | null
  isPublic: boolean
  trustScore: number
  priceReports: number
  validatedPriceReports: number
  priceConfirmations: number
  verifiedStations: number
  approvedEdits: number
}

type CommunityProfileRow = {
  display_name: string | null
  avatar_url: string | null
  profile_is_public: boolean
  trust_score: number
  price_reports: number
  validated_price_reports: number
  price_confirmations: number
  verified_stations: number
  approved_edits: number
}

export async function loadMyCommunityProfile(): Promise<CommunityProfile> {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const { data, error } = await supabase.rpc('my_community_profile')
  if (error) throw error
  const row = (data as CommunityProfileRow[] | null)?.[0]
  if (!row) throw new Error('Perfil não encontrado.')
  return mapProfile(row)
}

export async function updateMyCommunityProfile(input: Pick<CommunityProfile, 'displayName' | 'avatarUrl' | 'isPublic'>) {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const { error } = await supabase.rpc('update_my_community_profile', {
    p_display_name: input.displayName.trim(),
    p_avatar_url: input.avatarUrl?.trim() || null,
    p_profile_is_public: input.isPublic,
  })
  if (error) throw error
}

function mapProfile(row: CommunityProfileRow): CommunityProfile {
  return {
    displayName: row.display_name ?? 'Motorista botali',
    avatarUrl: row.avatar_url,
    isPublic: row.profile_is_public,
    trustScore: Number(row.trust_score),
    priceReports: Number(row.price_reports),
    validatedPriceReports: Number(row.validated_price_reports),
    priceConfirmations: Number(row.price_confirmations),
    verifiedStations: Number(row.verified_stations),
    approvedEdits: Number(row.approved_edits),
  }
}
