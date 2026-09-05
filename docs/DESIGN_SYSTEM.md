# Design System v1.0

## Princípio visual

O botali é uma plataforma de tecnologia e mobilidade, não uma rede de postos. A interface deve ter pouco ruído visual, hierarquia forte para preço e distância, bordas moderadamente arredondadas e ícones consistentes.

## Cores oficiais

- Verde botali: `#22C55E` — ação principal, localização, recomendação e sucesso.
- Grafite: `#111827` — estrutura, navegação e fundos principais.
- Off-white: `#F8FAFC` — conteúdo, textos em fundo escuro e superfícies claras.
- Âmbar: `#FBBF24` — atenção, avaliação e reputação.
- Informação: `#3B82F6`.
- Erro: `#EF4444`.

Use como referência a proporção 70/20/10: neutros estruturais, superfícies e cores de ação. Não transforme a interface inteira em verde.

## Tipografia e forma

- Fonte: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Escala de espaçamento baseada em múltiplos de 4 px.
- Raios: 8, 12, 16 e 20 px; pills em 999 px.
- Área mínima de toque: 44 × 44 px.
- Contraste mínimo: WCAG AA.

## Componentes

Estruture a interface em quatro camadas: Tokens → Primitivos → Componentes botali → Features.

Preço comunitário deve sempre mostrar confiança por texto, número e cor. No mapa, somente a melhor opção usa o verde principal; os demais marcadores ficam neutros. No celular, priorize mapa com bottom sheet; no desktop, lista lateral com mapa.

O seletor do mapa alterna Gasolina, Etanol, Diesel e Recarga. Marcadores de combustível mostram o preço selecionado como informação principal e, quando possível, “Etanol NN%” em uma segunda linha discreta. O modo Recarga usa azul informativo e filtra postos com carregamento elétrico.

### Componentes mobile implementados

- `Button`: ações primária, secundária e ghost.
- `Chip`: filtros selecionáveis do mapa.
- `EmptyState`: ausência de favoritos ou atividade.
- `BottomNavigation`: Explorar, Favoritos, Contribuir, Atividade e Perfil.
- `ConfidenceBadge`: confiança sempre expressa por texto, número e cor.
- `FlexRatioBadge`: recomendação flex com percentual explícito.
- `StationMarker`: preço, percentual flex e recarga no mapa com hierarquia compacta.
- `StationSheet`: detalhes, confiança, favorito, atualização e rota do posto.
- `ActivityScreen`: histórico real de contribuições com estados autenticado, vazio, carregando e erro.
- Modais de autenticação e atualização rápida de preço.

Novas telas mobile devem compor esses componentes e os tokens de `apps/mobile/src/theme/tokens.ts`, sem duplicar cores ou medidas localmente.

## Marca

O símbolo combina B, direção e localização. Não substitua a identidade principal por bomba de combustível, gota, chama, volante ou carro genérico.
