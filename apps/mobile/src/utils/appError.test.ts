import { describe, expect, it } from 'vitest'
import { describeAppError, diagnosticForError, userMessageForError } from './appError'

describe('tratamento de erros do aplicativo', () => {
  it('diferencia falha de conexão de uma lista vazia', () => {
    expect(userMessageForError(new TypeError('Network request failed'), 'Falha')).toContain('Sem conexão')
    expect(userMessageForError(new TypeError('fetch failed: java.net.UnknownHostException'), 'Falha')).toContain('Sem conexão')
  })

  it('traduz sessão expirada e falta de permissão', () => {
    expect(userMessageForError({ message: 'JWT expired', status: 401 }, 'Falha')).toContain('sessão expirou')
    expect(userMessageForError({ message: 'permission denied', code: '42501' }, 'Falha')).toContain('permissão')
  })

  it('preserva mensagens de regra de negócio úteis ao motorista', () => {
    const message = 'Você precisa estar a até 200 metros do posto'
    expect(userMessageForError(new Error(message), 'Falha')).toBe(message)
  })

  it('não expõe detalhes SQL na interface', () => {
    expect(userMessageForError({ message: 'relation public.secrets does not exist', code: '42P01' }, 'Não foi possível carregar.')).toBe('Não foi possível carregar.')
  })

  it('remove tokens, e-mail e coordenadas do diagnóstico local', () => {
    const token = `${'a'.repeat(24)}.${'b'.repeat(24)}.${'c'.repeat(24)}`
    const message = diagnosticForError('stations.load', new Error(`Bearer ${token} pessoa@example.com -19.123456, -44.654321`)).message
    expect(message).not.toContain(token)
    expect(message).not.toContain('pessoa@example.com')
    expect(message).not.toContain('-19.123456')
  })

  it('aceita erros estruturados do Supabase', () => {
    expect(describeAppError({ message: 'Falhou', code: 'PGRST001', status: 503 })).toMatchObject({ message: 'Falhou', code: 'PGRST001', status: 503 })
  })
})
