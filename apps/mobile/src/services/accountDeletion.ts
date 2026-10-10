import { supabase } from '../lib/supabase'
import { profileAvatarPath } from './communityProfile'

export async function deleteRemoteAccount(userId: string, confirmation: string): Promise<void> {
  if (!supabase || !userId) throw new Error('Conta não encontrada.')
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (user?.id !== userId) throw new Error('A conta ativa mudou. Abra o perfil novamente antes de excluir.')

  // Storage objects owned by the user can block deletion from auth.users.
  const path = profileAvatarPath(userId)
  const avatars = supabase.storage.from('profile-avatars')
  const { data: exists, error: lookupError } = await avatars.exists(path)
  if (lookupError) throw lookupError
  if (exists) {
    const { error: removeError } = await avatars.remove([path])
    if (removeError) throw removeError
  }

  const { error } = await supabase.rpc('delete_my_account', { confirmation })
  if (error) throw error
}
