import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'

export const authRedirectUrl = 'botali://auth/callback'

export async function finishAuthRedirect(url: string) {
  if (!supabase || !url.startsWith(authRedirectUrl)) return

  const parsed = new URL(url)
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const errorDescription = fragment.get('error_description') ?? parsed.searchParams.get('error_description')
  if (errorDescription) throw new Error(errorDescription)

  const code = parsed.searchParams.get('code')
  const accessToken = fragment.get('access_token') ?? parsed.searchParams.get('access_token')
  const refreshToken = fragment.get('refresh_token') ?? parsed.searchParams.get('refresh_token')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (error) throw error
  }
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Configure o Supabase para entrar com o Google.')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data.url) throw new Error('Não foi possível abrir o login do Google.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl)
  if (result.type === 'success') await finishAuthRedirect(result.url)
  return result.type
}
