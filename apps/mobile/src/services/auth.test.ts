import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authRedirectUrl, finishAuthRedirect, signInWithGoogle } from './auth'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({ supabase: { auth: {
  exchangeCodeForSession: mocks.exchangeCodeForSession,
  signInWithOAuth: mocks.signInWithOAuth,
} } }))
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: mocks.openAuthSessionAsync }))
vi.mock('expo-apple-authentication', () => ({}))
vi.mock('expo-crypto', () => ({}))
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))

describe('retorno seguro do login Google', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it('troca apenas um código enviado ao destino exato', async () => {
    expect(await finishAuthRedirect(`${authRedirectUrl}?code=valid-one`)).toBe(true)
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('valid-one')
    expect(await finishAuthRedirect(`${authRedirectUrl}/outro?code=forged`)).toBe(false)
    expect(await finishAuthRedirect('botali://other/callback?code=forged')).toBe(false)
    expect(await finishAuthRedirect('botali://outsider@auth/callback?code=forged')).toBe(false)
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })

  it('rejeita tokens e retornos sem código', async () => {
    await expect(finishAuthRedirect(`${authRedirectUrl}#access_token=abc&refresh_token=def`))
      .rejects.toThrow('Retorno do login inválido')
    await expect(finishAuthRedirect(`${authRedirectUrl}?access_token=abc&refresh_token=def`))
      .rejects.toThrow('Retorno do login inválido')
    await expect(finishAuthRedirect(authRedirectUrl)).rejects.toThrow('Retorno do login inválido')
    await expect(finishAuthRedirect(`${authRedirectUrl}?code=one&code=two`))
      .rejects.toThrow('Retorno do login inválido')
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('processa uma única vez quando o navegador e o listener recebem o mesmo código', async () => {
    const url = `${authRedirectUrl}?code=valid-two`
    await Promise.all([finishAuthRedirect(url), finishAuthRedirect(url)])
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('valid-two')
    expect(await finishAuthRedirect(url)).toBe(true)
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })

  it('abre o provedor e exige um retorno válido', async () => {
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: 'https://example.invalid/login' }, error: null })
    mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${authRedirectUrl}?code=valid-three` })
    expect(await signInWithGoogle()).toBe('success')
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: {
      redirectTo: authRedirectUrl, skipBrowserRedirect: true,
    } })
    expect(mocks.openAuthSessionAsync).toHaveBeenCalledWith('https://example.invalid/login', authRedirectUrl)

    mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${authRedirectUrl}/extra?code=bad` })
    await expect(signInWithGoogle()).rejects.toThrow('Retorno do login inválido')
  })
})
