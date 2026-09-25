/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDirectory = fileURLToPath(new URL('.', import.meta.url))
const trustMigration = readFileSync(resolve(currentDirectory, '../../../../supabase/migrations/202609100001_trust_privacy_and_moderation.sql'), 'utf8')
const freshnessMigration = readFileSync(resolve(currentDirectory, '../../../../supabase/migrations/202609150001_price_freshness_five_days.sql'), 'utf8')
const locationEditMigration = readFileSync(resolve(currentDirectory, '../../../../supabase/migrations/202609160001_station_location_edit_moderation.sql'), 'utf8')
const stationSearchMigration = readFileSync(resolve(currentDirectory, '../../../../supabase/migrations/202609170001_station_search_pagination.sql'), 'utf8')
const visibleBoundsMigration = readFileSync(resolve(currentDirectory, '../../../../supabase/migrations/202609240002_station_search_visible_bounds.sql'), 'utf8')

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

describe('contrato de atualidade dos preços', () => {
  it('usa cinco dias para consenso e confirmação', () => {
    expect(freshnessMigration.match(/interval '5 days'/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('mantém o último preço conhecido com confiança baixa e sem confirmação', () => {
    expect(freshnessMigration).toContain('latest_known as')
    expect(freshnessMigration).toMatch(/latest_known\.normalized_price,[\s\S]*10,[\s\S]*null::uuid/)
  })
})

describe('contrato de correção da localização do posto', () => {
  it('registra o ponto anterior e o ponto proposto para a moderação', () => {
    expect(locationEditMigration).toContain("'latitude', target.latitude")
    expect(locationEditMigration).toContain("'longitude', target.longitude")
    expect(locationEditMigration).toContain("'latitude', proposed_latitude")
    expect(locationEditMigration).toContain("'longitude', proposed_longitude")
  })

  it('valida os limites geográficos e só aplica o ponto durante a aprovação', () => {
    expect(locationEditMigration).toContain('proposed_latitude not between -90 and 90')
    expect(locationEditMigration).toContain('proposed_longitude not between -180 and 180')
    expect(locationEditMigration).toMatch(/if decision = 'approved' then[\s\S]*latitude = next_latitude,[\s\S]*longitude = next_longitude/)
  })

  it('mantém a proteção contra postos iguais no mesmo local', () => {
    expect(locationEditMigration).toContain('s.id <> target_station_id')
    expect(locationEditMigration).toContain('extensions.st_dwithin')
  })
})

describe('contrato de paginação geográfica', () => {
  it('impõe no banco o limite máximo de 200 postos por consulta', () => {
    expect(stationSearchMigration).toContain('result_limit integer default 200')
    expect(stationSearchMigration).toContain('limit least(greatest(result_limit, 1), 200)')
  })

  it('preserva busca PostGIS por distância e aceita deslocamento de página', () => {
    expect(stationSearchMigration).toContain('extensions.st_dwithin')
    expect(stationSearchMigration).toContain('operator(extensions.<->)')
    expect(stationSearchMigration).toContain('offset least(greatest(result_offset, 0), 10000)')
  })

  it('limita a busca nesta área ao retângulo visível e a 200 resultados por página', () => {
    expect(visibleBoundsMigration).toContain('extensions.st_makeenvelope')
    expect(visibleBoundsMigration).toContain('extensions.st_covers')
    expect(visibleBoundsMigration).toContain('limit least(greatest(result_limit, 1), 200)')
    expect(visibleBoundsMigration).toContain('offset least(greatest(result_offset, 0), 10000)')
  })
})
