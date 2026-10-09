import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'
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

export async function signInWithApple(): Promise<'success' | 'cancel'> {
  if (Platform.OS !== 'ios' || !await AppleAuthentication.isAvailableAsync()) {
    throw new Error('Entrar com Apple está disponível apenas em dispositivos iOS compatíveis.')
  }
  if (!supabase) throw new Error('Não foi possível conectar ao serviço de login.')

  // Apple receives the hash; Supabase checks it against the original nonce.
  const rawNonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)
  let credential: AppleAuthentication.AppleAuthenticationCredential
  try {
    credential = await AppleAuthentication.signInAsync({
      nonce: hashedNonce,
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return 'cancel'
    throw error
  }
  if (!credential.identityToken) throw new Error('A Apple não retornou a identificação necessária. Tente novamente.')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple', token: credential.identityToken, nonce: rawNonce,
  })
  if (error) throw error

  const fullName = [credential.fullName?.givenName, credential.fullName?.middleName, credential.fullName?.familyName].filter(Boolean).join(' ').trim()
  if (fullName && !data.user?.user_metadata?.full_name) {
    // Apple supplies the name only at the first authorization.
    await supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => undefined)
  }
  return 'success'
}
