import { supabase } from '../lib/supabase'
import { decode } from 'base64-arraybuffer'

export type CommunityBadge = {
  id: string
  title: string
  description: string
  iconName: string
  accentColor: string
  awardedAt: string | null
}

export type CommunityProfile = {
  displayName: string
  avatarUrl: string | null
  avatarPath: string | null
  isPublic: boolean
  trustScore: number
  priceReports: number
  validatedPriceReports: number
  priceConfirmations: number
  verifiedStations: number
  approvedEdits: number
  contributionPoints: number
  levelNumber: number
  levelTitle: string
  levelMinPoints: number
  nextLevelPoints: number
  levelProgressPercent: number
  badges: CommunityBadge[]
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
  contribution_points: number
  level_number: number
  level_title: string
  level_min_points: number
  next_level_points: number
  level_progress_percent: number
  badges: CommunityBadge[] | null
}

export async function loadMyCommunityProfile(): Promise<CommunityProfile> {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const { data, error } = await supabase.rpc('my_community_profile')
  if (error) throw error
  const row = (data as CommunityProfileRow[] | null)?.[0]
  if (!row) throw new Error('Perfil não encontrado.')
  return mapProfile(row)
}

export async function updateMyCommunityProfile(input: Pick<CommunityProfile, 'displayName' | 'avatarPath' | 'isPublic'>) {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const { error } = await supabase.rpc('update_my_community_profile', {
    p_display_name: input.displayName.trim(),
    p_avatar_url: input.avatarPath?.trim() || null,
    p_profile_is_public: input.isPublic,
  })
  if (error) throw error
}

export async function uploadMyAvatar(userId: string, base64: string) {
  if (!supabase) throw new Error('Serviço de dados não configurado neste aplicativo.')
  const path = `${userId}/avatar.jpg`
  const { error } = await supabase.storage.from('profile-avatars').upload(path, decode(base64), {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return path
}

export async function removeMyAvatar(path: string) {
  if (!supabase || path.startsWith('https://')) return
  const { error } = await supabase.storage.from('profile-avatars').remove([path])
  if (error) throw error
}

async function mapProfile(row: CommunityProfileRow): Promise<CommunityProfile> {
  const avatarPath = row.avatar_url
  let avatarUrl = avatarPath
  if (supabase && avatarPath && !avatarPath.startsWith('https://')) {
    const { data, error } = await supabase.storage.from('profile-avatars').createSignedUrl(avatarPath, 3600)
    if (error) throw error
    avatarUrl = data.signedUrl
  }
  return {
    displayName: row.display_name ?? 'Motorista botali',
    avatarUrl,
    avatarPath,
    isPublic: row.profile_is_public,
    trustScore: Number(row.trust_score),
    priceReports: Number(row.price_reports),
    validatedPriceReports: Number(row.validated_price_reports),
    priceConfirmations: Number(row.price_confirmations),
    verifiedStations: Number(row.verified_stations),
    approvedEdits: Number(row.approved_edits),
    contributionPoints: Number(row.contribution_points),
    levelNumber: Number(row.level_number),
    levelTitle: row.level_title,
    levelMinPoints: Number(row.level_min_points),
    nextLevelPoints: Number(row.next_level_points),
    levelProgressPercent: Number(row.level_progress_percent),
    badges: Array.isArray(row.badges) ? row.badges : [],
  }
}
