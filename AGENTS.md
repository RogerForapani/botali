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
- Trate o aplicativo React Native para Android/iOS como produto principal; o frontend Vite é um protótipo durante a migração.
- Mantenha a experiência mobile-first, acessível e silenciosa por padrão.
- Preserve as regras geoespaciais no PostgreSQL/PostGIS e mantenha o provedor de mapa desacoplado.
- Não crie formulários ou solicitações repetitivas de confirmação; use sinais passivos e ações rápidas com limite de frequência.
- Nunca exponha ou versione segredos, `.env.local` ou chave `service_role` do Supabase.
- A consulta de postos deve funcionar sem login; autenticação é exigida apenas para contribuições.
- Novos postos começam como `pending` e devem respeitar a prevenção de duplicidade geográfica.

## Validação

Antes de concluir mudanças de código, execute `npm run lint` e `npm run build`.
