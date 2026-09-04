# Diretrizes para agentes

Antes de alterar o produto, consulte os documentos em `docs/`.

## Fonte de verdade

- `docs/PRODUCT.md`: visão, proposta e experiência do produto.
- `docs/DESIGN_SYSTEM.md`: identidade visual e regras de interface.
- `docs/ARCHITECTURE.md`: arquitetura técnica e limites das camadas.
- `docs/BUSINESS_RULES.md`: regras de preços, confiança e contribuições.

## Regras obrigatórias

- Preserve o nome oficial `botali` e a tagline “O melhor posto tá ali.”
- Não altere identidade, paleta, arquitetura ou regras fundamentais sem decisão explícita do responsável pelo produto.
- Reutilize tokens e componentes do Design System; não invente estilos isolados por tela.
- Mantenha a experiência mobile-first e acessível.
- Preserve Leaflet/OpenStreetMap como camada de mapa inicial e mantenha regras geoespaciais no PostgreSQL/PostGIS.
- Nunca exponha ou versione segredos, `.env.local` ou chave `service_role` do Supabase.
- A consulta de postos deve funcionar sem login; autenticação é exigida apenas para contribuições.
- Novos postos começam como `pending` e devem respeitar a prevenção de duplicidade geográfica.

## Validação

Antes de concluir mudanças de código, execute `npm run lint` e `npm run build`.
