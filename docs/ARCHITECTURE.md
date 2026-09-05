# Arquitetura

## Frontend

- React + TypeScript + Vite.
- Leaflet como biblioteca de mapas.
- OpenStreetMap como fonte cartográfica inicial.
- A camada de mapas deve permanecer desacoplada para permitir troca futura de provedor sem reescrever regras de negócio.

## Backend e dados

- Supabase para autenticação e acesso à Data API.
- PostgreSQL + PostGIS para persistência e consultas geoespaciais.
- RLS habilitado e validado antes de exposição em produção.
- Busca por proximidade, raio e duplicidade pertence ao PostGIS, não ao componente de mapa.

## Organização evolutiva

```text
src/
├── components/
│   ├── ui/
│   └── botali/
├── features/
├── services/
├── styles/
├── types/
└── utils/
```

O MVP atual ainda é compacto. A migração para essa estrutura deve ocorrer incrementalmente, preservando comportamento e testes de build.

## Segurança

- Somente chaves públicas do Supabase podem chegar ao navegador.
- Nunca versionar `.env.local` nem `service_role`.
- Operações privilegiadas devem ser executadas no backend ou por funções protegidas.
- Geolocalização é dado pessoal: capture somente com ação clara, valide proximidade no banco e retenha o mínimo necessário.
