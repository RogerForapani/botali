# Design System v1.0

## Princípio visual

O botali é uma plataforma de tecnologia e mobilidade, não uma rede de postos. A interface deve ter pouco ruído visual, hierarquia forte para preço e distância, bordas moderadamente arredondadas e ícones consistentes.

## Cores oficiais

- Verde botali: `#22C55E` — ação principal, localização, recomendação e sucesso.
- Grafite neutro: `#171717` — estrutura, navegação e fundos principais.
- Off-white: `#FAFAF7` — conteúdo, textos em fundo escuro e superfícies claras.
- Âmbar: `#FBBF24` — atenção, avaliação e reputação.
- Informação: `#3B82F6`.
- Erro: `#EF4444`.

Use como referência a proporção 70/20/10: neutros estruturais, superfícies e cores de ação. Não transforme a interface inteira em verde.

O aplicativo oferece temas claro e escuro. O modo claro é o padrão inicial; a preferência escolhida pelo usuário é persistida no dispositivo. O tema escuro usa cinzas neutros, sem deslocamento azulado, mantendo verde, âmbar, azul informativo e vermelho como cores semânticas oficiais.

## Tipografia e forma

- Fonte: `Inter` (pesos 400, 600, 700 e 900), com a fonte nativa do sistema apenas como contingência.
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
- `StationMarker`: bandeira textual, preço, percentual flex e recarga no mapa com hierarquia compacta.
- `StationClusterMarker`: quantidade de postos próximos; ao tocar, o mapa aproxima e separa progressivamente os marcadores.
- `StationFilters`: catálogo dinâmico de combustíveis e serviços, aberto sob demanda para manter o mapa limpo.
- `StationSearch`: busca expansível com raio, classificação por distância, preço e confiança e paginação adicional sob demanda.
- `StationSheet`: detalhes, confiança, favorito, atualização e rota do posto.
- `ActivityScreen`: histórico real de contribuições com estados autenticado, vazio, carregando e erro.
- `CommunityProfileCard`: identidade pública opcional, resumo agregado de contribuições e edição com privacidade explícita.
- `VehicleProfileCard`: resumo compacto no Perfil e edição sob demanda de tipo, marca, modelo, ano, combustível e consumo.
- A busca e o detalhe do posto exibem distância a partir da posição do motorista, nunca a distância do centro do mapa como se fosse dele. O custo estimado aparece somente nos detalhes expandidos, com ressalva explícita sobre a distância em linha reta.
- O perfil comunitário usa as cinco molduras de nível e os cinco badges ilustrados em `apps/mobile/assets/community/`. A foto permanece visível no centro transparente da moldura; títulos e descrições acompanham as artes para preservar compreensão e acessibilidade.
- O badge azul de Moderador Botali indica uma função ativa carregada de `user_roles` e aparece em uma seção própria do perfil. Não é uma conquista por pontos; deixa de aparecer quando a função é removida.
- Modais de autenticação e atualização rápida de preço.

Os controles usam a família Material Community Icons. Símbolos de texto ou emojis não devem substituir ícones de interface, pois variam visualmente entre Android e iOS.

Novas telas mobile devem compor esses componentes e os tokens de `apps/mobile/src/theme/tokens.ts`, sem duplicar cores ou medidas localmente.

## Marca

O símbolo combina B, direção e localização. Não substitua a identidade principal por bomba de combustível, gota, chama, volante ou carro genérico.
