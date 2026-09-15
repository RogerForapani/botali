/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDirectory = fileURLToPath(new URL('.', import.meta.url))
const trustMigration = readFileSync(resolve(currentDirectory, '../../../../supabase/migrations/202609100001_trust_privacy_and_moderation.sql'), 'utf8')

describe('contratos de confiança e privacidade do PostgreSQL', () => {
  it('não expõe contribuições, confirmações ou perfis brutos anonimamente', () => {
    expect(trustMigration).toContain('revoke select on public.price_submissions from anon, authenticated')
    expect(trustMigration).toContain('revoke select on public.price_confirmations from anon, authenticated')
    expect(trustMigration).toContain('revoke select on public.profiles from anon, authenticated')
    expect(trustMigration).toContain('prices_read_own_or_moderator')
  })

  it('mostra posto pendente apenas ao autor ou à moderação', () => {
    expect(trustMigration).toMatch(/stations_anon_verified_read[\s\S]*using \(status = 'verified'\)/)
    expect(trustMigration).toMatch(/stations_authenticated_scoped_read[\s\S]*created_by = \(select auth\.uid\(\)\)[\s\S]*private\.is_moderator/)
  })

  it('conta somente o relato mais recente de cada usuário no consenso', () => {
    expect(trustMigration).toContain('distinct on (p.station_id, p.fuel_type_id, p.user_id)')
    expect(trustMigration).toContain('order by p.station_id, p.fuel_type_id, p.user_id, p.created_at desc')
  })

  it('impede autoconfirmação e peso duplo de quem já relatou preço', () => {
    expect(trustMigration).toContain('Você não pode confirmar o próprio relato')
    expect(trustMigration).toContain('Seu próprio relato já conta para este combustível')
    expect(trustMigration).toMatch(/not exists \([\s\S]*reporter\.user_id = c\.user_id/)
  })

  it('limita confirmação presencial e protege contagens pequenas de visita', () => {
    expect(trustMigration).toContain('if visit_distance > 200')
    expect(trustMigration).toContain('having count(*) >= 3')
    expect(trustMigration).toContain("America/Sao_Paulo")
  })
})
