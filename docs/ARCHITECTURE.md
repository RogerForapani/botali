# Arquitetura

## Aplicativo principal

- React Native + Expo + TypeScript para Android e iOS.
- Development builds para recursos nativos de localização em segundo plano.
- Geofencing com `expo-location` e tarefas com `expo-task-manager`.
- Mapa nativo; evitar dependência estrutural de um único provedor.
- A camada de mapas deve permanecer desacoplada para permitir troca futura de provedor sem reescrever regras de negócio.

## Protótipo web

- O código React + Vite atual permanece como referência executável durante a migração.
- Leaflet e OpenStreetMap continuam no protótipo, mas não definem a implementação nativa final.
- Novas funcionalidades de produto devem priorizar o aplicativo mobile.

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
- Solicite localização em primeiro plano antes da permissão em segundo plano e explique o benefício no momento adequado.
- Prefira geofencing e processamento local a atualizações contínuas de GPS.
- Android suporta até 100 geofences ativas por app; iOS, até 20 regiões. Registre dinamicamente apenas os postos mais próximos.
