import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

export const authRedirectUrl = process.env.EXPO_PUBLIC_APP_VARIANT === 'restore-drill'
  ? 'botali-restore://auth/callback'
  : 'botali://auth/callback'

const pendingExchanges = new Map<string, Promise<void>>()
const exchangedCodes = new Set<string>()

export async function finishAuthRedirect(url: string): Promise<boolean> {
  if (!supabase) return false

  let parsed: URL
  try { parsed = new URL(url) } catch { return false }
  const expected = new URL(authRedirectUrl)
  if (parsed.protocol !== expected.protocol || parsed.host !== expected.host || parsed.pathname !== expected.pathname
    || parsed.username || parsed.password) return false

  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const errorDescription = fragment.get('error_description') ?? parsed.searchParams.get('error_description')
  if (errorDescription) throw new Error(errorDescription)

  const code = parsed.searchParams.get('code')
  if (!code || parsed.searchParams.getAll('code').length !== 1
    || fragment.has('access_token') || fragment.has('refresh_token')
    || parsed.searchParams.has('access_token') || parsed.searchParams.has('refresh_token')) {
    throw new Error('Retorno do login inválido. Tente entrar novamente.')
  }

  if (exchangedCodes.has(code)) return true
  let exchange = pendingExchanges.get(code)
  if (!exchange) {
    exchange = (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
      exchangedCodes.add(code)
      if (exchangedCodes.size > 5) exchangedCodes.delete(exchangedCodes.values().next().value!)
    })()
    pendingExchanges.set(code, exchange)
  }
  try { await exchange } finally { pendingExchanges.delete(code) }
  return true
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
  if (result.type === 'success' && !await finishAuthRedirect(result.url)) {
    throw new Error('Retorno do login inválido. Tente entrar novamente.')
  }
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
