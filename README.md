# botali

**O melhor posto tá ali.**

Aplicação web mobile-first para encontrar postos próximos, comparar preços de combustíveis informados pela comunidade e avaliar a confiança de cada informação.

## Estado atual

- React, TypeScript e Vite
- Leaflet com OpenStreetMap
- mapa, lista, busca, raio e seleção de combustível
- alternância dos marcadores entre gasolina, etanol, diesel e recarga elétrica
- comparação flex com percentual do etanol sobre a gasolina
- detalhes e confiança separados por combustível
- dados demonstrativos isolados em `src/data/stations.ts`
- Supabase Auth e cliente preparado em `src/lib/supabase.ts`
- migração PostgreSQL/PostGIS em `supabase/migrations/`
- cadastro de postos com localização e bloqueio de duplicidade em 100 metros
- novos postos entram com status `pending`
- envio autenticado de preços por combustível, com localização opcional
- consenso por volume de relatos, reputação e confirmações recentes
- check-in voluntário por GPS, validado em até 200 metros e armazenado sem coordenada exata

## Documentação do produto

- [Produto](docs/PRODUCT.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Regras de negócio](docs/BUSINESS_RULES.md)
- [Diretrizes para agentes](AGENTS.md)

## Executar localmente

```powershell
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

## Configurar o Supabase

Copie `.env.example` para `.env.local` e preencha:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use somente a chave pública no frontend. A chave `service_role` nunca deve ser armazenada no projeto ou enviada ao navegador. Aplique a migração em um projeto Supabase e valide as políticas RLS antes de habilitar dados reais em produção.

O mapa permanece acessível sem login. A autenticação só é solicitada quando o visitante tenta contribuir.
